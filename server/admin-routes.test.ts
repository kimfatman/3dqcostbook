import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminMocks = vi.hoisted(() => ({
  getAdminHealth: vi.fn(),
  getAdminOverview: vi.fn(),
  getAdminVersion: vi.fn(),
}));

vi.mock("./admin", () => adminMocks);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUser(role: "admin" | "member"): AuthenticatedUser {
  const now = new Date("2026-08-28T00:00:00.000Z");
  return {
    id: `${role}-id`,
    email: `${role}@example.com`,
    phoneNumber: null,
    cloudbaseSubject: null,
    name: role === "admin" ? "系统管理员" : "普通店主",
    avatarAssetId: null,
    avatarPreset: null,
    passwordHash: "never-returned",
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedInAt: now,
  };
}

describe("admin read-only routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.getAdminHealth.mockResolvedValue({
      status: "ok",
      checkedAt: new Date("2026-08-28T00:00:00.000Z"),
      checks: { database: { status: "ok", latencyMs: 2 } },
    });
    adminMocks.getAdminVersion.mockReturnValue({
      version: "1.0.0",
      schema: "drizzle-mysql",
      environment: "test",
      generatedAt: new Date("2026-08-28T00:00:00.000Z"),
    });
    adminMocks.getAdminOverview.mockResolvedValue({
      generatedAt: new Date("2026-08-28T00:00:00.000Z"),
      version: "1.0.0",
      counts: { users: 2, workspaces: 2, auditEvents: 3, workspaceBooks: 2 },
      data: { latestWorkspaceBookUpdatedAt: null, latestWorkspaceBookSchemaVersion: 3 },
    });
  });

  it("rejects unauthenticated calls before reaching admin services", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.admin.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.version()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(adminMocks.getAdminHealth).not.toHaveBeenCalled();
    expect(adminMocks.getAdminVersion).not.toHaveBeenCalled();
    expect(adminMocks.getAdminOverview).not.toHaveBeenCalled();
  });

  it("rejects member calls and does not reveal whether admin data exists", async () => {
    const caller = appRouter.createCaller(createContext(createUser("member")));

    await expect(caller.admin.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.version()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(adminMocks.getAdminHealth).not.toHaveBeenCalled();
    expect(adminMocks.getAdminVersion).not.toHaveBeenCalled();
    expect(adminMocks.getAdminOverview).not.toHaveBeenCalled();
  });

  it("allows an admin to read only the typed, redacted contracts", async () => {
    const caller = appRouter.createCaller(createContext(createUser("admin")));

    await expect(caller.admin.health()).resolves.toMatchObject({
      status: "ok",
      checks: { database: { status: "ok", latencyMs: 2 } },
    });
    await expect(caller.admin.version()).resolves.toEqual({
      version: "1.0.0",
      schema: "drizzle-mysql",
      environment: "test",
      generatedAt: new Date("2026-08-28T00:00:00.000Z"),
    });
    await expect(caller.admin.overview()).resolves.toMatchObject({
      counts: { users: 2, workspaces: 2, auditEvents: 3, workspaceBooks: 2 },
      data: { latestWorkspaceBookSchemaVersion: 3 },
    });

    const serialized = JSON.stringify(await caller.admin.overview());
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("accessToken");
    expect(serialized).not.toContain("verification");
    expect(serialized).not.toContain("DATABASE_URL");
  });

  it("propagates a service failure instead of returning a false success", async () => {
    adminMocks.getAdminOverview.mockRejectedValueOnce(new Error("Database is unavailable"));
    const caller = appRouter.createCaller(createContext(createUser("admin")));

    await expect(caller.admin.overview()).rejects.toThrow("Database is unavailable");
  });
});
