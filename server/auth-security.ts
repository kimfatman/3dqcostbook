import { createHash } from "node:crypto";

export const PASSWORD_POLICY_MESSAGE = "密码不符合安全要求，请使用至少 8 位且避免常见弱口令";
export const AUTH_THROTTLED_MESSAGE = "操作过于频繁，请稍后再试";

const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password123",
  "password1234",
  "qwerty",
  "qwerty123",
  "qwerty12345",
  "abc12345",
  "admin123",
  "welcome123",
  "iloveyou",
  "letmein",
  "00000000",
]);

const OBVIOUS_SEQUENCES = ["1234567890", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string };

function normalizePassword(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^\w\u00c0-\uffff]+/g, "");
}

function hasRepeatedShortPattern(value: string) {
  for (let unitLength = 1; unitLength <= 4; unitLength += 1) {
    if (value.length > unitLength * 2 && value.length % unitLength === 0) {
      const unit = value.slice(0, unitLength);
      if (unit.repeat(value.length / unitLength) === value) return true;
    }
  }
  return false;
}

function isObviousSequence(value: string) {
  return OBVIOUS_SEQUENCES.some(sequence => sequence.includes(value) || sequence.split("").reverse().join("").includes(value));
}

/**
 * 采用易理解的长度优先策略：不强制符号或大小写组合，但阻止公开常见口令、纯空白和明显重复/顺序组合。
 */
export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 8 || password.length > 128 || password.trim().length === 0) return { ok: false, message: PASSWORD_POLICY_MESSAGE };

  const normalized = normalizePassword(password);
  if (!normalized || COMMON_WEAK_PASSWORDS.has(normalized)) return { ok: false, message: PASSWORD_POLICY_MESSAGE };
  if (normalized.length >= 8 && new Set(normalized).size < 3) return { ok: false, message: PASSWORD_POLICY_MESSAGE };
  if (hasRepeatedShortPattern(normalized) || (normalized.length >= 8 && isObviousSequence(normalized))) return { ok: false, message: PASSWORD_POLICY_MESSAGE };

  return { ok: true };
}

export function assertPasswordPolicy(password: string) {
  const result = validatePasswordPolicy(password);
  if (!result.ok) throw new Error(result.message);
}

export type AuthRateLimitKey = string;

export class FailedAttemptLimiter {
  private readonly failures = new Map<AuthRateLimitKey, number[]>();

  constructor(
    private readonly options: { maxFailures?: number; windowMs?: number; now?: () => number } = {},
  ) {}

  private get maxFailures() {
    return this.options.maxFailures ?? 5;
  }

  private get windowMs() {
    return this.options.windowMs ?? 15 * 60 * 1000;
  }

  private now() {
    return (this.options.now ?? Date.now)();
  }

  private activeFailures(key: AuthRateLimitKey, now = this.now()) {
    const active = (this.failures.get(key) ?? []).filter(timestamp => now - timestamp < this.windowMs);
    if (active.length) this.failures.set(key, active);
    else this.failures.delete(key);
    return active;
  }

  isBlocked(key: AuthRateLimitKey) {
    return this.activeFailures(key).length >= this.maxFailures;
  }

  recordFailure(key: AuthRateLimitKey) {
    const failures = this.activeFailures(key);
    failures.push(this.now());
    this.failures.set(key, failures);
  }

  clear(key: AuthRateLimitKey) {
    this.failures.delete(key);
  }

  clearAll() {
    this.failures.clear();
  }
}

export const authFailedAttemptLimiter = new FailedAttemptLimiter();
const otpSendCooldowns = new Map<AuthRateLimitKey, number>();
const OTP_SEND_COOLDOWN_MS = 60 * 1000;

function stableIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** 仅使用 Express 已根据受信任反向代理计算的 req.ip，不直接信任客户端可伪造的转发头。 */
export function getRequestClientAddress(req: { ip?: unknown; socket?: { remoteAddress?: unknown } }) {
  const candidate = typeof req.ip === "string" && req.ip.trim()
    ? req.ip.trim()
    : typeof req.socket?.remoteAddress === "string" && req.socket.remoteAddress.trim()
      ? req.socket.remoteAddress.trim()
      : "unknown";
  return candidate.slice(0, 128);
}

export function createAuthRateLimitKeys(scope: "bootstrap" | "login" | "register" | "cloudbase", req: { ip?: unknown; socket?: { remoteAddress?: unknown } }, identity: string) {
  return [
    `auth:${scope}:ip:${getRequestClientAddress(req)}`,
    `auth:${scope}:identity:${stableIdentity(identity.trim().toLocaleLowerCase())}`,
  ] as const;
}

export function assertAuthAttemptAllowed(keys: readonly AuthRateLimitKey[]) {
  if (keys.some(key => authFailedAttemptLimiter.isBlocked(key))) throw new Error(AUTH_THROTTLED_MESSAGE);
}

export function recordAuthFailure(keys: readonly AuthRateLimitKey[]) {
  keys.forEach(key => authFailedAttemptLimiter.recordFailure(key));
}

export function clearAuthFailures(keys: readonly AuthRateLimitKey[]) {
  keys.forEach(key => authFailedAttemptLimiter.clear(key));
}

/** 成功发送也进入 60 秒冷却，避免仅依赖上游服务时被重复转发消耗额度。 */
export function assertOtpSendAllowed(keys: readonly AuthRateLimitKey[], now = Date.now()) {
  if (keys.some(key => (otpSendCooldowns.get(key) ?? 0) > now)) throw new Error("获取过于频繁，请 60 秒后再试");
}

export function recordOtpSend(keys: readonly AuthRateLimitKey[], now = Date.now()) {
  keys.forEach(key => otpSendCooldowns.set(key, now + OTP_SEND_COOLDOWN_MS));
}

/** 仅供自动化测试重置单进程内存状态；多实例生产环境应在后续迭代接入共享限流存储。 */
export function resetAuthSecurityForTesting() {
  authFailedAttemptLimiter.clearAll();
  otpSendCooldowns.clear();
}
