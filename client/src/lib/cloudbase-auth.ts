import cloudbase from "@cloudbase/js-sdk";

function cloudbaseConfiguration() {
  const env = import.meta.env.VITE_CLOUDBASE_ENV_ID;
  const accessKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY;
  if (!env || !accessKey) throw new Error("验证码服务暂不可用，请稍后再试");
  return { env, accessKey };
}

/** 浏览器仅使用 CloudBase Publishable Key；服务器 API Key 永不进入该模块或构建产物。 */
export function getCloudbaseAuth() {
  const { env, accessKey } = cloudbaseConfiguration();
  return cloudbase.init({ env, region: "ap-shanghai", accessKey }).auth;
}

/** 用户主动退出时同步清理 CloudBase 浏览器会话，避免后续设备复用自动恢复验证码身份。 */
export async function clearCloudbaseBrowserSession() {
  try {
    const result = await getCloudbaseAuth().signOut();
    if (result && "error" in result && result.error) throw result.error;
  } catch (error) {
    // 本地 HttpOnly 会话已优先退出；CloudBase 会话清理失败不应阻断退出。
    console.warn("CloudBase 会话清理失败", error);
  }
}
