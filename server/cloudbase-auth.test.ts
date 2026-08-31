import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudbaseOtpError, completeCloudbaseOtpChallenge, requestCloudbaseOtpChallenge, resetCloudbaseOtpChallengesForTesting, verifyCloudbaseAccessToken } from "./cloudbase-auth";

const fetchMock = vi.fn();

describe("verifyCloudbaseAccessToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    resetCloudbaseOtpChallengesForTesting();
    delete process.env.CLOUDBASE_ENV_ID;
  });

  it("仅从 CloudBase user/me 回源响应读取已验证的用户身份", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ sub: "cloudbase-subject", email: "OWNER@EXAMPLE.COM", phone_number: "+8613800000000", status: "ACTIVE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyCloudbaseAccessToken("valid-cloudbase-user-token")).resolves.toEqual({ subject: "cloudbase-subject", email: "owner@example.com", phoneNumber: "+8613800000000" });
    expect(fetchMock).toHaveBeenCalledWith("https://cloudbase-test.api.tcloudbasegateway.com/auth/v1/user/me", expect.objectContaining({ headers: { Authorization: "Bearer valid-cloudbase-user-token", Accept: "application/json" } }));
  });

  it("拒绝无效、封禁或没有已绑定邮箱和手机号的 CloudBase 身份", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    await expect(verifyCloudbaseAccessToken("expired-token")).rejects.toThrow("验证已失效或不可用");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sub: "blocked", email: "blocked@example.com", status: "BLOCKED" }), { status: 200 }));
    await expect(verifyCloudbaseAccessToken("blocked-token")).rejects.toThrow("验证已失效或不可用");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sub: "anonymous", status: "ACTIVE" }), { status: 200 }));
    await expect(verifyCloudbaseAccessToken("anonymous-token")).rejects.toThrow("验证已失效或不可用");
  });

  it("仅向浏览器返回本站 challenge id，并在服务器内完成验证码、登录令牌与身份回源交换", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_id: "provider-verification-id" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_token: "provider-verification-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "cloudbase-user-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: "cloudbase-subject", email: "owner@example.com", status: "ACTIVE" }), { status: 200 }));

    const challenge = await requestCloudbaseOtpChallenge({ method: "email", target: "owner@example.com", purpose: "login" });
    expect(challenge).toMatchObject({ expiresIn: 600 });
    expect(challenge.challengeId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(JSON.stringify(challenge)).not.toContain("provider-verification-id");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://cloudbase-test.api.tcloudbasegateway.com/auth/v1/verification", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com", target: "ANY" }),
    }));

    await expect(completeCloudbaseOtpChallenge({ challengeId: challenge.challengeId, verificationCode: "123456", purpose: "login" })).resolves.toEqual({ subject: "cloudbase-subject", email: "owner@example.com", phoneNumber: undefined });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://cloudbase-test.api.tcloudbasegateway.com/auth/v1/verification/verify", expect.objectContaining({ body: JSON.stringify({ verification_id: "provider-verification-id", verification_code: "123456" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "https://cloudbase-test.api.tcloudbasegateway.com/auth/v1/signin", expect.objectContaining({ body: JSON.stringify({ verification_token: "provider-verification-token" }) }));
  });
});

describe("completeCloudbaseOtpChallenge 验证失败按根因分类", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    resetCloudbaseOtpChallengesForTesting();
    delete process.env.CLOUDBASE_ENV_ID;
  });

  it("验证码错误时抛出 verification_code_invalid 错误码与具体提示", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_id: "provider-verification-id" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "invalid_verification_code", error_description: "验证码错误" }), { status: 400 }));

    const challenge = await requestCloudbaseOtpChallenge({ method: "email", target: "owner@example.com", purpose: "login" });
    const failure = await completeCloudbaseOtpChallenge({ challengeId: challenge.challengeId, verificationCode: "000000", purpose: "login" }).catch(error => error);
    expect(failure).toBeInstanceOf(CloudbaseOtpError);
    expect(failure.code).toBe("verification_code_invalid");
    expect(failure.message).toBe("验证码错误，请重新输入");
  });

  it("验证码过期时抛出 challenge_expired 错误码与具体提示", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_id: "provider-verification-id" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "verification_code_expired", error_description: "验证码已过期" }), { status: 400 }));

    const challenge = await requestCloudbaseOtpChallenge({ method: "email", target: "owner@example.com", purpose: "login" });
    const failure = await completeCloudbaseOtpChallenge({ challengeId: challenge.challengeId, verificationCode: "123456", purpose: "login" }).catch(error => error);
    expect(failure).toBeInstanceOf(CloudbaseOtpError);
    expect(failure.code).toBe("challenge_expired");
    expect(failure.message).toBe("验证码已过期，请重新获取");
  });

  it("challenge 不存在时抛出 challenge_not_found 错误码且不再请求网关", async () => {
    process.env.CLOUDBASE_ENV_ID = "cloudbase-test";
    vi.stubGlobal("fetch", fetchMock);

    const failure = await completeCloudbaseOtpChallenge({ challengeId: "00000000-0000-4000-8000-000000000000", verificationCode: "123456", purpose: "login" }).catch(error => error);
    expect(failure).toBeInstanceOf(CloudbaseOtpError);
    expect(failure.code).toBe("challenge_not_found");
    expect(failure.message).toBe("验证会话不存在，请重新获取验证码");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
