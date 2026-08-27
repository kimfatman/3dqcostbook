import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyCloudbaseAccessToken } from "./cloudbase-auth";

const fetchMock = vi.fn();

describe("verifyCloudbaseAccessToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
