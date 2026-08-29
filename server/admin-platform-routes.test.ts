import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listAdminAuditEvents: vi.fn(),
  listMigrationReviews: vi.fn(),
  reviewMigration: vi.fn(),
  listGlobalConfigs: vi.fn(),
  saveGlobalConfigDraft: vi.fn(),
  publishGlobalConfig: vi.fn(),
}));

vi.mock("./admin-platform-data", () => mocks);

type User = NonNullable<TrpcContext["user"]>;
function ctx(user: User | null): TrpcContext { return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
function admin(): User {
  const date = new Date("2026-08-28T00:00:00.000Z");
  return { id: "admin-1", email: "admin@example.com", phoneNumber: null, cloudbaseSubject: null, name: "管理员", avatarAssetId: null, avatarPreset: null, passwordHash: "redacted", role: "admin", status: "active", createdAt: date, updatedAt: date, lastSignedInAt: date };
}

describe("admin P2 platform routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAdminAuditEvents.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    mocks.listMigrationReviews.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    mocks.reviewMigration.mockResolvedValue({ migrationId: "0008_left_aqueduct", status: "approved" });
    mocks.listGlobalConfigs.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    mocks.saveGlobalConfigDraft.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", configKey: "home.notice", version: 1, status: "draft" });
    mocks.publishGlobalConfig.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", configKey: "home.notice", version: 1, status: "published" });
  });

  it("allows an admin to query paginated audit and migration data", async () => {
    const caller = appRouter.createCaller(ctx(admin()));
    await caller.admin.audit.list({ page: 2, pageSize: 40, outcome: "failure", targetType: "config" });
    await caller.admin.migrations.list({ page: 1, pageSize: 10, status: "pending" });
    expect(mocks.listAdminAuditEvents).toHaveBeenCalledWith({ page: 2, pageSize: 40, outcome: "failure", targetType: "config" });
    expect(mocks.listMigrationReviews).toHaveBeenCalledWith({ page: 1, pageSize: 10, status: "pending" });
  });

  it("requires confirmation for migration decisions and config publication", async () => {
    const caller = appRouter.createCaller(ctx(admin()));
    const review = { migrationId: "0008_left_aqueduct", title: "账本状态字段", impactSummary: "仅新增默认值字段", rollbackPlan: "停止路由后执行反向迁移", destructive: false, status: "approved" as const };
    await expect(caller.admin.migrations.review(review)).rejects.toThrow("二次确认");
    await caller.admin.migrations.review({ ...review, confirm: true });
    expect(mocks.reviewMigration).toHaveBeenCalledWith({ ...review, confirm: true, actorUserId: "admin-1" });

    const publish = { configId: "00000000-0000-4000-8000-000000000001" };
    await expect(caller.admin.configs.publish(publish)).rejects.toThrow("二次确认");
    await caller.admin.configs.publish({ ...publish, confirm: true });
    expect(mocks.publishGlobalConfig).toHaveBeenCalledWith({ ...publish, confirm: true, actorUserId: "admin-1" });
  });

  it("accepts only scalar, bounded, non-sensitive configuration drafts", async () => {
    const caller = appRouter.createCaller(ctx(admin()));
    await caller.admin.configs.saveDraft({ configKey: "home.notice", payload: { enabled: true, text: "系统维护通知", priority: 2, nullable: null }, changeSummary: "更新维护提示" });
    expect(mocks.saveGlobalConfigDraft).toHaveBeenCalledWith({ configKey: "home.notice", payload: { enabled: true, text: "系统维护通知", priority: 2, nullable: null }, changeSummary: "更新维护提示", actorUserId: "admin-1" });
    await expect(caller.admin.configs.saveDraft({ configKey: "home.notice", payload: { accessToken: "never" }, changeSummary: "错误配置" })).rejects.toThrow();
  });

  it("rejects non-admin and unauthenticated access to every P2 domain", async () => {
    const member = { ...admin(), role: "member" as const };
    const anonymous = appRouter.createCaller(ctx(null));
    const ordinary = appRouter.createCaller(ctx(member));
    for (const caller of [anonymous, ordinary]) {
      await expect(caller.admin.audit.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.migrations.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.configs.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(mocks.listAdminAuditEvents).not.toHaveBeenCalled();
    expect(mocks.listMigrationReviews).not.toHaveBeenCalled();
    expect(mocks.listGlobalConfigs).not.toHaveBeenCalled();
  });
});
