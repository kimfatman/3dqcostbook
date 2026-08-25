import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { AUTH_THROTTLED_MESSAGE, resetAuthSecurityForTesting } from "./auth-security";

const dbMocks = vi.hoisted(() => ({
  createInitialAdmin: vi.fn(),
  getAppUserByEmail: vi.fn(),
  hasAnyAppUsers: vi.fn(),
  markSignedIn: vi.fn(),
  registerAndCreateWorkspace: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  signSession: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMocks,
}));

vi.mock("./local-auth", async importOriginal => ({
  ...(await importOriginal<typeof import("./local-auth")>()),
  ...authMocks,
}));

const { appRouter } = await import("./routers");

function anonymousContext(ip = "203.0.113.7"): TrpcContext {
  return {
    user: null,
    req: { ip } as never,
    res: { cookie: vi.fn() } as never,
  };
}

beforeEach(() => {
  resetAuthSecurityForTesting();
  vi.clearAllMocks();
  authMocks.hashPassword.mockResolvedValue("scrypt$hash");
  authMocks.signSession.mockReturnValue("signed-session");
});

afterEach(() => {
  delete process.env.BOOTSTRAP_ADMIN_TOKEN;
});

describe("public auth route security", () => {
  it("does not call registration storage for a known weak password", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.auth.registerAndCreateWorkspace({
      email: "shop@example.com",
      name: "李晓",
      password: "password123",
      workspaceName: "晓食店",
      industryId: "canteen",
    })).rejects.toThrow("密码不符合安全要求");
    expect(dbMocks.getAppUserByEmail).not.toHaveBeenCalled();
    expect(dbMocks.registerAndCreateWorkspace).not.toHaveBeenCalled();
  });

  it("returns one generic error and blocks repeated failed logins from the same source", async () => {
    dbMocks.getAppUserByEmail.mockResolvedValue({ id: "user-1", email: "shop@example.com", passwordHash: "scrypt$hash", name: "李晓", role: "member" });
    authMocks.verifyPassword.mockResolvedValue(false);
    const caller = appRouter.createCaller(anonymousContext());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(caller.auth.login({ email: "shop@example.com", password: "not-the-right-password" })).rejects.toThrow("邮箱或密码错误");
    }
    await expect(caller.auth.login({ email: "shop@example.com", password: "not-the-right-password" })).rejects.toThrow(AUTH_THROTTLED_MESSAGE);
  });

  it("clears login failures after a successful login", async () => {
    dbMocks.getAppUserByEmail.mockResolvedValue({ id: "user-1", email: "shop@example.com", passwordHash: "scrypt$hash", name: "李晓", role: "member" });
    authMocks.verifyPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const caller = appRouter.createCaller(anonymousContext());

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(caller.auth.login({ email: "shop@example.com", password: "not-the-right-password" })).rejects.toThrow("邮箱或密码错误");
    }
    await expect(caller.auth.login({ email: "shop@example.com", password: "correct-password" })).resolves.toMatchObject({ user: { id: "user-1" } });
    await expect(caller.auth.login({ email: "shop@example.com", password: "not-the-right-password" })).rejects.toThrow("邮箱或密码错误");
  });

  it("applies the same password guard before first-admin initialization", async () => {
    process.env.BOOTSTRAP_ADMIN_TOKEN = "a-secure-bootstrap-token-that-is-long-enough";
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.auth.bootstrap({
      token: process.env.BOOTSTRAP_ADMIN_TOKEN,
      email: "admin@example.com",
      name: "管理员",
      password: "12345678",
      workspaceName: "总账本",
    })).rejects.toThrow("密码不符合安全要求");
    expect(dbMocks.createInitialAdmin).not.toHaveBeenCalled();
  });
});
