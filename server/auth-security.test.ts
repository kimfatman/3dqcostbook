import { describe, expect, it } from "vitest";
import {
  AUTH_THROTTLED_MESSAGE,
  FailedAttemptLimiter,
  assertPasswordPolicy,
  createAuthRateLimitKeys,
  getRequestClientAddress,
  validatePasswordPolicy,
} from "./auth-security";

describe("password policy", () => {
  it("accepts an eight-character-or-longer passphrase without requiring arbitrary character classes", () => {
    expect(validatePasswordPolicy("春风吹过小店账本")).toEqual({ ok: true });
    expect(validatePasswordPolicy("riverstone")).toEqual({ ok: true });
  });

  it("rejects short, common, blank and obvious repeated passwords with one safe message", () => {
    for (const password of ["short", "password123", "        ", "abababab", "12345678"]) {
      expect(validatePasswordPolicy(password)).toMatchObject({ ok: false });
      expect(() => assertPasswordPolicy(password)).toThrow("密码不符合安全要求");
    }
  });
});

describe("failed authentication attempt limiter", () => {
  it("blocks after the configured number of failures, then expires and can be cleared by success", () => {
    let now = 0;
    const limiter = new FailedAttemptLimiter({ maxFailures: 2, windowMs: 1_000, now: () => now });
    limiter.recordFailure("login:ip");
    limiter.recordFailure("login:ip");
    expect(limiter.isBlocked("login:ip")).toBe(true);

    limiter.clear("login:ip");
    expect(limiter.isBlocked("login:ip")).toBe(false);

    limiter.recordFailure("login:ip");
    limiter.recordFailure("login:ip");
    now = 1_001;
    expect(limiter.isBlocked("login:ip")).toBe(false);
  });

  it("keys limits by trusted Express IP and a hashed identity rather than exposing the email in memory keys", () => {
    const keys = createAuthRateLimitKeys("login", { ip: "203.0.113.9" }, "Shop@Example.com");
    expect(keys[0]).toBe("auth:login:ip:203.0.113.9");
    expect(keys[1]).toMatch(/^auth:login:identity:[a-f0-9]{64}$/);
    expect(keys[1]).not.toContain("shop@example.com");
    expect(getRequestClientAddress({ ip: "198.51.100.2", socket: { remoteAddress: "10.0.0.2" } })).toBe("198.51.100.2");
    expect(AUTH_THROTTLED_MESSAGE).toContain("频繁");
  });
});
