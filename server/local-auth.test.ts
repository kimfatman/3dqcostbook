import { describe, expect, it } from "vitest";
import { hashPassword, signSession, verifyPassword, verifySession } from "./local-auth";

describe("local authentication primitives", () => {
  it("hashes and verifies a password without retaining plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("signs a tamper-evident local session", () => {
    const original = process.env.APP_SESSION_SECRET;
    process.env.APP_SESSION_SECRET = "test-session-secret-with-at-least-thirty-two-characters";
    const token = signSession("user-123");
    expect(verifySession(token)?.sub).toBe("user-123");
    expect(verifySession(`${token}x`)).toBeNull();
    process.env.APP_SESSION_SECRET = original;
  });
});
