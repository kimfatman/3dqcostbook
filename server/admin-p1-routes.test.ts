import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dataMocks = vi.hoisted(() => ({
  listAdminUsers: vi.fn(),
  listAdminWorkspaces: vi.fn(),
  setAdminUserStatus: vi.fn(),
  setAdminWorkspaceStatus: vi.fn(),
}));

vi.mock("./admin-data", () => dataMocks);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(user: AuthenticatedUser | null): TrpcContext {
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function user(role: "admin" | "member", status: "active" | "suspended" = "active"): AuthenticatedUser {
  const date = new Date("2026-08-28T00:00:00.000Z");
  return {
    id: `${role}-1`, email: `${role}@example.com`, phoneNumber: null, cloudbaseSubject: null,
    name: role, avatarAssetId: null, avatarPreset: null, passwordHash: "redacted", role, status,
    createdAt: date, updatedAt: date, lastSignedInAt: date,
  };
}

describe("admin P1 list and status routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMocks.listAdminUsers.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    dataMocks.listAdminWorkspaces.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    dataMocks.setAdminUserStatus.mockResolvedValue({ changed: true, status: "suspended" });
    dataMocks.setAdminWorkspaceStatus.mockResolvedValue({ changed: true, status: "suspended" });
  });

  it("passes bounded pagination and filters to user and workspace list services", async () => {
    const caller = appRouter.createCaller(context(user("admin")));

    await caller.admin.users.list({ page: 2, pageSize: 50, query: " 小店 ", status: "active" });
    await caller.admin.workspaces.list({ page: 1, pageSize: 10, query: "餐饮", status: "suspended" });

    expect(dataMocks.listAdminUsers).toHaveBeenCalledWith({ page: 2, pageSize: 50, query: "小店", status: "active" });
    expect(dataMocks.listAdminWorkspaces).toHaveBeenCalledWith({ page: 1, pageSize: 10, query: "餐饮", status: "suspended" });
  });

  it("applies safe defaults and rejects unbounded pagination", async () => {
    const caller = appRouter.createCaller(context(user("admin")));

    await caller.admin.users.list({});
    expect(dataMocks.listAdminUsers).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    await expect(caller.admin.workspaces.list({ page: 1, pageSize: 101 })).rejects.toThrow();
  });

  it("requires server-validated confirmation before status mutations", async () => {
    const caller = appRouter.createCaller(context(user("admin")));
    const input = { userId: "00000000-0000-4000-8000-000000000001", status: "suspended" as const, reason: "用户申请暂停" };

    await expect(caller.admin.users.setStatus(input)).rejects.toThrow("二次确认");
    expect(dataMocks.setAdminUserStatus).not.toHaveBeenCalled();
    await caller.admin.users.setStatus({ ...input, confirm: true, requestId: "00000000-0000-4000-8000-000000000002" });
    expect(dataMocks.setAdminUserStatus).toHaveBeenCalledWith({ ...input, confirm: true, requestId: "00000000-0000-4000-8000-000000000002", targetUserId: input.userId, actorUserId: "admin-1" });
  });

  it("rejects member, suspended admin, and unauthenticated access before service calls", async () => {
    await expect(appRouter.createCaller(context(null)).admin.users.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context(user("member"))).admin.workspaces.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context(user("admin", "suspended"))).admin.users.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dataMocks.listAdminUsers).not.toHaveBeenCalled();
    expect(dataMocks.listAdminWorkspaces).not.toHaveBeenCalled();
  });

  it("passes workspace status mutations through the admin boundary", async () => {
    const caller = appRouter.createCaller(context(user("admin")));
    const input = { workspaceId: "00000000-0000-4000-8000-000000000003", status: "active" as const, reason: "恢复经营工作区", confirm: true as const };

    await caller.admin.workspaces.setStatus(input);
    expect(dataMocks.setAdminWorkspaceStatus).toHaveBeenCalledWith({ ...input, actorUserId: "admin-1" });
  });
});
