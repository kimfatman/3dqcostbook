import { describe, expect, it, vi } from "vitest";
import { preparePersonalWorkspaceRegistration } from "./db";
import { LOCAL_SESSION_COOKIE, verifySession } from "./local-auth";

const dbMocks = vi.hoisted(() => ({
  registerAndCreateWorkspace: vi.fn(),
  getAppUserByEmail: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAppUserByEmail: dbMocks.getAppUserByEmail,
    registerAndCreateWorkspace: dbMocks.registerAndCreateWorkspace,
  };
});

describe("public personal-workspace registration", () => {
  it("creates one member owner, one empty book and a registration audit event for the same personal workspace", () => {
    const registration = preparePersonalWorkspaceRegistration(
      { email: "Shop@Example.COM", name: "李晓", passwordHash: "scrypt$hash", workspaceName: "晓食店", industryId: "canteen" },
      { userId: "user-1", workspaceId: "workspace-1", auditId: "audit-1" },
    );

    expect(registration.user).toMatchObject({ id: "user-1", email: "shop@example.com", role: "member" });
    expect(registration.workspace).toMatchObject({ id: "workspace-1", ownerId: "user-1", industryId: "canteen" });
    expect(registration.membership).toEqual({ workspaceId: "workspace-1", userId: "user-1", role: "owner" });
    expect(registration.book).toEqual({ workspaceId: "workspace-1", state: {}, updatedByUserId: "user-1" });
    expect(registration.audit).toMatchObject({ workspaceId: "workspace-1", actorUserId: "user-1", targetId: "workspace-1", action: "workspace.register" });
  });

  it("sets a session for the registered user only after the personal workspace is created", async () => {
    const previousSecret = process.env.APP_SESSION_SECRET;
    process.env.APP_SESSION_SECRET = "test-session-secret-with-at-least-thirty-two-characters";
    dbMocks.getAppUserByEmail.mockResolvedValue(undefined);
    dbMocks.registerAndCreateWorkspace.mockResolvedValue({ userId: "4eabeb5f-df3e-49ec-9170-b20f8292d4aa", workspaceId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0" });
    const cookies: Array<{ name: string; value: string }> = [];
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: {} as never,
      res: { cookie: (name: string, value: string) => cookies.push({ name, value }) } as never,
    });

    await expect(caller.auth.registerAndCreateWorkspace({ email: "shop@example.com", name: "李晓", password: "long-enough-password", workspaceName: "晓食店", industryId: "canteen" })).resolves.toEqual({ workspaceId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0" });
    expect(dbMocks.registerAndCreateWorkspace).toHaveBeenCalledWith(expect.objectContaining({ email: "shop@example.com", workspaceName: "晓食店", industryId: "canteen" }));
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(LOCAL_SESSION_COOKIE);
    expect(verifySession(cookies[0]?.value ?? "")?.sub).toBe("4eabeb5f-df3e-49ec-9170-b20f8292d4aa");
    process.env.APP_SESSION_SECRET = previousSecret;
  });
});
