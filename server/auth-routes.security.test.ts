import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { LOCAL_SESSION_COOKIE } from "./local-auth";
import { AUTH_THROTTLED_MESSAGE, resetAuthSecurityForTesting } from "./auth-security";

const dbMocks = vi.hoisted(() => ({
  createInitialAdmin: vi.fn(),
  getAppUserByCloudbaseSubject: vi.fn(),
  getAppUserByEmail: vi.fn(),
  getAppUserByPhoneNumber: vi.fn(),
  hasAnyAppUsers: vi.fn(),
  linkCloudbaseIdentity: vi.fn(),
  markSignedIn: vi.fn(),
  registerAndCreateWorkspace: vi.fn(),
  registerCloudbaseUserAndCreateWorkspace: vi.fn(),
  updateAppUserPassword: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  signSession: vi.fn(),
  verifyPassword: vi.fn(),
}));

const cloudbaseMocks = vi.hoisted(() => ({ verifyCloudbaseAccessToken: vi.fn() }));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMocks,
}));

vi.mock("./local-auth", async importOriginal => ({
  ...(await importOriginal<typeof import("./local-auth")>()),
  ...authMocks,
}));

vi.mock("./cloudbase-auth", () => cloudbaseMocks);

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
  cloudbaseMocks.verifyCloudbaseAccessToken.mockResolvedValue({ subject: "cloudbase-subject-1", email: "shop@example.com", phoneNumber: "+8613800138000" });
  dbMocks.getAppUserByCloudbaseSubject.mockResolvedValue(undefined);
  dbMocks.getAppUserByEmail.mockResolvedValue(undefined);
  dbMocks.getAppUserByPhoneNumber.mockResolvedValue(undefined);
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

  it("only links a CloudBase identity after token verification and issues the existing local session", async () => {
    const user = { id: "user-1", email: "shop@example.com", phoneNumber: null, cloudbaseSubject: null, passwordHash: "scrypt$hash", name: "李晓", role: "member" };
    dbMocks.getAppUserByEmail.mockResolvedValue(user);
    dbMocks.linkCloudbaseIdentity.mockResolvedValue({ ...user, cloudbaseSubject: "cloudbase-subject-1", phoneNumber: "+8613800138000" });
    const ctx = anonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.loginWithCloudbase({ accessToken: "a".repeat(24) })).resolves.toMatchObject({ user: { id: "user-1", phoneNumber: "+8613800138000" } });
    expect(cloudbaseMocks.verifyCloudbaseAccessToken).toHaveBeenCalledWith("a".repeat(24));
    expect(dbMocks.linkCloudbaseIdentity).toHaveBeenCalledWith("user-1", expect.objectContaining({ subject: "cloudbase-subject-1" }));
    expect(ctx.res.cookie).toHaveBeenCalledWith(LOCAL_SESSION_COOKIE, "signed-session", expect.any(Object));
  });

  it("requires an existing local account for CloudBase login rather than creating one implicitly", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.auth.loginWithCloudbase({ accessToken: "a".repeat(24) })).rejects.toThrow("验证已完成，请继续创建店铺");
    expect(dbMocks.registerCloudbaseUserAndCreateWorkspace).not.toHaveBeenCalled();
  });

  it("creates a personal workspace only after a verified CloudBase token and strong local fallback password", async () => {
    dbMocks.registerCloudbaseUserAndCreateWorkspace.mockResolvedValue({ userId: "user-2", workspaceId: "workspace-2" });
    const ctx = anonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.registerWithCloudbase({ accessToken: "a".repeat(24), name: "李晓", password: "a secure long passphrase", workspaceName: "晓食店", industryId: "canteen" })).resolves.toEqual({ workspaceId: "workspace-2" });
    expect(dbMocks.registerCloudbaseUserAndCreateWorkspace).toHaveBeenCalledWith(expect.objectContaining({ subject: "cloudbase-subject-1", email: "shop@example.com", passwordHash: "scrypt$hash" }));
    expect(ctx.res.cookie).toHaveBeenCalledWith(LOCAL_SESSION_COOKIE, "signed-session", expect.any(Object));
  });

  it("refuses a weak new password before using a CloudBase token for password reset", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.auth.resetPasswordWithCloudbase({ accessToken: "a".repeat(24), password: "password123" })).rejects.toThrow("密码不符合安全要求");
    expect(cloudbaseMocks.verifyCloudbaseAccessToken).not.toHaveBeenCalled();
    expect(dbMocks.updateAppUserPassword).not.toHaveBeenCalled();
  });
});
