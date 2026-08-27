export type CloudbaseVerifiedIdentity = {
  subject: string;
  email?: string;
  phoneNumber?: string;
};

const CLOUD_BASE_GATEWAY_SUFFIX = ".api.tcloudbasegateway.com";

function normalizeOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

/**
 * 仅接受 CloudBase 用户 access token，并通过官方 user/me 端点回源校验。
 * 不信任浏览器声明的 uid、邮箱或手机号，也不以管理员 API Key 代替用户令牌。
 */
export async function verifyCloudbaseAccessToken(accessToken: string): Promise<CloudbaseVerifiedIdentity> {
  const environmentId = process.env.CLOUDBASE_ENV_ID;
  if (!environmentId) throw new Error("验证码服务暂不可用，请稍后再试");
  const response = await fetch(`https://${environmentId}${CLOUD_BASE_GATEWAY_SUFFIX}/auth/v1/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("验证已失效或不可用，请重新获取验证码");
  const profile = await response.json() as Record<string, unknown>;
  const subject = normalizeOptional(profile.sub, 128) ?? normalizeOptional(profile.user_id, 128);
  const email = normalizeOptional(profile.email, 320)?.toLowerCase();
  const phoneNumber = normalizeOptional(profile.phone_number, 24);
  const status = normalizeOptional(profile.status, 32);
  if (!subject || status === "BLOCKED" || (!email && !phoneNumber)) throw new Error("验证已失效或不可用，请重新获取验证码");
  return { subject, email, phoneNumber };
}
