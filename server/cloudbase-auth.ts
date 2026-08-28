import { randomUUID } from "node:crypto";

export type CloudbaseVerifiedIdentity = {
  subject: string;
  email?: string;
  phoneNumber?: string;
};

export type CloudbaseOtpMethod = "email" | "sms";
export type CloudbaseOtpPurpose = "login" | "register" | "recover";

type CloudbaseChallenge = {
  providerVerificationId: string;
  method: CloudbaseOtpMethod;
  purpose: CloudbaseOtpPurpose;
  target: string;
  expiresAt: number;
  attempts: number;
};

type GatewayFailure = { error?: unknown; code?: unknown; error_code?: unknown; error_description?: unknown };

const CLOUD_BASE_GATEWAY_SUFFIX = ".api.tcloudbasegateway.com";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;
const challenges = new Map<string, CloudbaseChallenge>();

function normalizeOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function gatewayUrl(path: string) {
  const environmentId = process.env.CLOUDBASE_ENV_ID;
  if (!environmentId) throw new Error("验证码服务暂不可用，请稍后再试");
  return `https://${environmentId}${CLOUD_BASE_GATEWAY_SUFFIX}${path}`;
}

async function responseData(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function providerMessage(failure: GatewayFailure, fallback: string) {
  const code = `${failure.error ?? failure.code ?? ""}`.toLowerCase();
  const detail = `${failure.error_description ?? ""}`.toLowerCase();
  if (code.includes("rate") || detail.includes("频率")) return "获取过于频繁，请 60 秒后再试";
  if (code.includes("captcha") || detail.includes("安全验证")) return "当前发送需要完成安全验证，请稍后再试";
  if (code.includes("invalid_verification") || detail.includes("验证码错误")) return "验证码错误或已过期，请重新获取";
  if (code.includes("expired") || detail.includes("过期")) return "验证码已过期，请重新获取";
  if (code.includes("phone") || detail.includes("手机号")) return "手机号格式或短信服务配置不可用，请检查后重试";
  return fallback;
}

function isUserMissing(failure: GatewayFailure) {
  const text = `${failure.error ?? failure.code ?? ""} ${failure.error_description ?? ""}`.toLowerCase();
  return text.includes("user_not_found") || text.includes("account_not_found") || text.includes("账号不存在") || text.includes("用户不存在");
}

async function postGateway(path: string, body: Record<string, unknown>) {
  const response = await fetch(gatewayUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await responseData(response);
  return { response, data };
}

function removeExpiredChallenges(now = Date.now()) {
  challenges.forEach((challenge, id) => {
    if (challenge.expiresAt <= now) challenges.delete(id);
  });
}

/**
 * 发送阶段只将本站随机 challenge id 返回给浏览器；CloudBase verification_id 始终保存在服务器内存。
 */
export async function requestCloudbaseOtpChallenge(input: { method: CloudbaseOtpMethod; target: string; purpose: CloudbaseOtpPurpose }) {
  removeExpiredChallenges();
  const targetField = input.method === "sms" ? "phone_number" : "email";
  const { response, data } = await postGateway("/auth/v1/verification", {
    [targetField]: input.target,
    // 对登录、注册和恢复一律不暴露本地账户存在性，后续由已验证身份与本地账号边界决定结果。
    target: "ANY",
  });
  const verificationId = normalizeOptional(data.verification_id, 8192);
  if (!response.ok || !verificationId) throw new Error(providerMessage(data, "验证码发送失败，请稍后再试"));

  const challengeId = randomUUID();
  challenges.set(challengeId, {
    providerVerificationId: verificationId,
    method: input.method,
    purpose: input.purpose,
    target: input.target,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    attempts: 0,
  });
  return { challengeId, expiresIn: 600 };
}

/**
 * 验证码、verification_token 与 CloudBase access token 均只在服务器内流转；浏览器仅收到既有本地 HttpOnly 会话。
 */
export async function completeCloudbaseOtpChallenge(input: { challengeId: string; verificationCode: string; purpose: CloudbaseOtpPurpose }) {
  removeExpiredChallenges();
  const challenge = challenges.get(input.challengeId);
  if (!challenge || challenge.purpose !== input.purpose || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
    throw new Error("验证码已失效，请重新获取");
  }
  challenge.attempts += 1;

  const verified = await postGateway("/auth/v1/verification/verify", {
    verification_id: challenge.providerVerificationId,
    verification_code: input.verificationCode,
  });
  const verificationToken = normalizeOptional(verified.data.verification_token, 8192);
  if (!verified.response.ok || !verificationToken) {
    if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) challenges.delete(input.challengeId);
    throw new Error(providerMessage(verified.data, "验证码错误或已过期，请重新获取"));
  }

  let signedIn = await postGateway("/auth/v1/signin", { verification_token: verificationToken });
  let accessToken = normalizeOptional(signedIn.data.access_token, 8192);
  if ((!signedIn.response.ok || !accessToken) && isUserMissing(signedIn.data)) {
    signedIn = await postGateway("/auth/v1/signup", challenge.method === "sms"
      ? { phone_number: challenge.target, verification_token: verificationToken }
      : { email: challenge.target, verification_token: verificationToken });
    accessToken = normalizeOptional(signedIn.data.access_token, 8192);
  }
  if (!signedIn.response.ok || !accessToken) throw new Error(providerMessage(signedIn.data, "无法完成验证码验证，请重新获取"));

  challenges.delete(input.challengeId);
  return verifyCloudbaseAccessToken(accessToken);
}

/**
 * 仅接受 CloudBase 用户 access token，并通过官方 user/me 端点回源校验。
 * 不信任浏览器声明的 uid、邮箱或手机号，也不以管理员 API Key 代替用户令牌。
 */
export async function verifyCloudbaseAccessToken(accessToken: string): Promise<CloudbaseVerifiedIdentity> {
  const response = await fetch(gatewayUrl("/auth/v1/user/me"), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("验证已失效或不可用，请重新获取验证码");
  const profile = await responseData(response);
  const subject = normalizeOptional(profile.sub, 128) ?? normalizeOptional(profile.user_id, 128);
  const email = normalizeOptional(profile.email, 320)?.toLowerCase();
  const phoneNumber = normalizeOptional(profile.phone_number, 24);
  const status = normalizeOptional(profile.status, 32);
  if (!subject || status === "BLOCKED" || (!email && !phoneNumber)) throw new Error("验证已失效或不可用，请重新获取验证码");
  return { subject, email, phoneNumber };
}

/** 仅用于单元回归，确保短期挑战不会跨测试残留。 */
export function resetCloudbaseOtpChallengesForTesting() {
  challenges.clear();
}
