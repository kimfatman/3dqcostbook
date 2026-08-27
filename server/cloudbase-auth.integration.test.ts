import cloudbase from "@cloudbase/node-sdk";
import { describe, expect, it } from "vitest";

const runCloudBaseIntegration = process.env.CLOUDBASE_VERIFY_INTEGRATION === "1";

/**
 * 只验证服务器 API Key 可建立 CloudBase 鉴权调用。
 * 查询固定的不存在用户，因此不会创建、变更或发送任何用户资源。
 */
describe.runIf(runCloudBaseIntegration)("CloudBase 服务器认证配置", () => {
  it("接受服务器 API Key 并允许受控的只读身份查询", async () => {
    const env = process.env.CLOUDBASE_ENV_ID;
    const accessKey = process.env.CLOUDBASE_APIKEY;

    expect(env).toBe("sdq12-d0gv14qu22e8df1eb");
    expect(accessKey).toBeTruthy();

    const app = cloudbase.init({ env, accessKey });
    const outcome = await app.auth().queryUserInfo({ uid: "00000000-0000-0000-0000-000000000000" })
      .then(result => JSON.stringify(result))
      .catch(error => String(error instanceof Error ? error.message : error));

    expect(outcome).not.toMatch(/(api\s*key|access\s*key|credential).*(invalid|missing|not found)|(invalid|missing|not found).*(api\s*key|access\s*key|credential)/i);
  }, 20_000);
});
