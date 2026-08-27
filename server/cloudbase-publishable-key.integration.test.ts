import { describe, expect, it } from "vitest";

const runCloudBaseIntegration = process.env.CLOUDBASE_VERIFY_INTEGRATION === "1";

/**
 * 使用 Publishable Key 请求需要用户 access token 的只读端点。
 * 正确的客户端 Key 会被网关接收，可能返回匿名身份或未登录拒绝；本测试不会触发验证码或写入数据。
 */
describe.runIf(runCloudBaseIntegration)("CloudBase 浏览器认证配置", () => {
  it("接受 Publishable Key 到用户认证网关", async () => {
    const env = process.env.VITE_CLOUDBASE_ENV_ID;
    const accessKey = process.env.VITE_CLOUDBASE_PUBLISHABLE_KEY;

    expect(env).toBe("sdq12-d0gv14qu22e8df1eb");
    expect(accessKey).toBeTruthy();

    const response = await fetch(`https://${env}.api.tcloudbasegateway.com/auth/v1/user/me`, {
      headers: { Authorization: `Bearer ${accessKey}`, Accept: "application/json" },
    });
    const text = await response.text();

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
    expect(text).not.toMatch(/(invalid|missing|not found).{0,80}(api|publishable|access)[ _-]?key|(api|publishable|access)[ _-]?key.{0,80}(invalid|missing|not found)/i);
  }, 20_000);
});
