import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getAdminHealth: vi.fn(),
  getAdminVersion: vi.fn(),
  getAdminOverview: vi.fn(),
  listAdminUsers: vi.fn(),
  setAdminUserStatus: vi.fn(),
  listAdminWorkspaces: vi.fn(),
  setAdminWorkspaceStatus: vi.fn(),
  listAdminAuditEvents: vi.fn(),
  listMigrationReviews: vi.fn(),
  reviewMigration: vi.fn(),
  getAdminPerformanceSummary: vi.fn(),
  getRuntimeMetrics: vi.fn(),
  listAdminMetricSamples: vi.fn(),
  listBackupSchedules: vi.fn(),
  createBackupSchedule: vi.fn(),
  setBackupScheduleStatus: vi.fn(),
  queueBackupRun: vi.fn(),
  listBackupRuns: vi.fn(),
}));

vi.mock("./admin", () => mocks);
vi.mock("./admin-data", () => mocks);
vi.mock("./admin-platform-data", () => mocks);
vi.mock("./admin-operations-data", () => mocks);

type User = NonNullable<TrpcContext["user"]>;
function context(user: User | null): TrpcContext {
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}
function admin(): User {
  const date = new Date("2026-08-28T00:00:00.000Z");
  return { id: "admin-e2e", email: "admin@example.com", phoneNumber: null, cloudbaseSubject: null, name: "E2E 管理员", avatarAssetId: null, avatarPreset: null, passwordHash: "redacted", role: "admin", status: "active", createdAt: date, updatedAt: date, lastSignedInAt: date };
}

const workspaceId = "00000000-0000-4000-8000-000000000101";
const scheduleId = "00000000-0000-4000-8000-000000000102";
const userId = "00000000-0000-4000-8000-000000000103";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminHealth.mockResolvedValue({ status: "ok", checkedAt: new Date(), durationMs: 3, errorSummary: null });
  mocks.getAdminVersion.mockResolvedValue({ appVersion: "test", schemaVersion: 10, environment: "test", generatedAt: new Date() });
  mocks.getAdminOverview.mockResolvedValue({ users: 2, workspaces: 1, auditEvents: 0, bookSnapshots: 1, latestBookUpdatedAt: null, schemaVersion: 10 });
  mocks.listAdminUsers.mockResolvedValue({ page: 1, pageSize: 10, total: 1, items: [{ id: userId, name: "张三", email: "z***@example.com", phoneNumber: null, role: "member", status: "active", cloudbaseLinked: true, workspaceCount: 1, createdAt: new Date(), lastSignedInAt: new Date() }] });
  mocks.setAdminUserStatus.mockResolvedValue({ changed: true, status: "suspended" });
  mocks.listAdminWorkspaces.mockResolvedValue({ page: 1, pageSize: 10, total: 1, items: [{ id: workspaceId, name: "演示账本", industryId: "retail", status: "active", ownerId: userId, ownerName: "张三", ownerEmail: "z***@example.com", memberCount: 1, book: { revision: 4, schemaVersion: 10, updatedAt: new Date() }, createdAt: new Date(), updatedAt: new Date() }] });
  mocks.setAdminWorkspaceStatus.mockResolvedValue({ changed: true, status: "suspended" });
  mocks.listAdminAuditEvents.mockResolvedValue({ page: 1, pageSize: 12, total: 1, items: [{ id: "audit-e2e", actorUserId: "admin-e2e", action: "backup.run.queue", targetType: "backup_run", targetId: "run-e2e", outcome: "success", requestId: null, details: { scheduleId }, createdAt: new Date() }] });
  mocks.listMigrationReviews.mockResolvedValue({ page: 1, pageSize: 8, total: 1, items: [{ id: "review-e2e", migrationId: "0010_kind_sentinel", title: "备份 worker 状态字段", impactSummary: "新增运行状态与租约字段", rollbackPlan: "回滚新增字段与索引", destructive: false, status: "pending", reviewedByUserId: null, reviewNote: null, createdAt: new Date(), updatedAt: new Date() }] });
  mocks.reviewMigration.mockResolvedValue({ migrationId: "0010_kind_sentinel", status: "approved" });
  mocks.getAdminPerformanceSummary.mockResolvedValue({ database: "ok", runtime: { uptimeSeconds: 10, heapUsedBytes: 1, heapTotalBytes: 2, rssBytes: 3, nodeMajor: 22 }, latestSamples: [] });
  mocks.getRuntimeMetrics.mockReturnValue({ uptimeSeconds: 10, heapUsedBytes: 1, heapTotalBytes: 2, rssBytes: 3, nodeMajor: 22 });
  mocks.listAdminMetricSamples.mockResolvedValue({ page: 1, pageSize: 12, total: 0, items: [] });
  mocks.listBackupSchedules.mockResolvedValue([{ id: scheduleId, name: "每日备份", cadence: "daily", runAt: "02:30", timezone: "Asia/Shanghai", retentionDays: 30, status: "enabled", createdByUserId: "admin-e2e", createdAt: new Date(), updatedAt: new Date() }]);
  mocks.createBackupSchedule.mockResolvedValue({ id: scheduleId, status: "enabled" });
  mocks.setBackupScheduleStatus.mockResolvedValue({ changed: true, status: "paused" });
  mocks.queueBackupRun.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000104", scheduleId, status: "queued" });
  mocks.listBackupRuns.mockResolvedValue({ page: 1, pageSize: 20, total: 1, items: [{ id: "run-e2e", scheduleId, status: "queued", startedAt: null, completedAt: null, bytesWritten: null, errorSummary: null, createdAt: new Date() }] });
});

describe("管理员管理平台端到端集成流程（本地隔离）", () => {
  it("从管理员身份确认到备份排队、审计查询形成闭环", async () => {
    const caller = appRouter.createCaller(context(admin()));

    expect((await caller.auth.me())?.role).toBe("admin");
    await caller.admin.health();
    await caller.admin.version();
    await caller.admin.overview();
    await caller.admin.metrics.summary();
    await caller.admin.metrics.list({ page: 1, pageSize: 12, periodMinutes: 360 });
    await caller.admin.users.list({ page: 1, pageSize: 10, query: "张三" });
    await caller.admin.workspaces.list({ page: 1, pageSize: 10, status: "active" });
    await caller.admin.users.setStatus({ userId, status: "suspended", reason: "E2E 风险演练", confirm: true });
    await caller.admin.workspaces.setStatus({ workspaceId, status: "suspended", reason: "E2E 结构维护", confirm: true });
    await caller.admin.migrations.list({ page: 1, pageSize: 8, status: "pending" });
    await caller.admin.migrations.review({ migrationId: "0010_kind_sentinel", title: "备份 worker 状态字段", impactSummary: "新增运行状态与租约字段", rollbackPlan: "回滚新增字段与索引", destructive: false, status: "approved", confirm: true, reviewNote: "已核对非破坏性迁移" });
    await caller.admin.backups.schedules.list();
    await caller.admin.backups.schedules.create({ name: "每日备份", cadence: "daily", runAt: "02:30", timezone: "Asia/Shanghai", retentionDays: 30, confirm: true });
    await caller.admin.backups.schedules.runNow({ scheduleId, confirm: true });
    const runs = await caller.admin.backups.runs({ page: 1, pageSize: 20, scheduleId, status: "queued" });
    await caller.admin.audit.list({ page: 1, pageSize: 12, targetType: "backup_run" });

    expect(runs.items[0]?.status).toBe("queued");
    expect(mocks.reviewMigration).toHaveBeenCalledWith(expect.objectContaining({ migrationId: "0010_kind_sentinel", status: "approved", confirm: true, actorUserId: "admin-e2e" }));
    expect(mocks.queueBackupRun).toHaveBeenCalledWith(expect.objectContaining({ scheduleId, confirm: true, actorUserId: "admin-e2e" }));
    expect(mocks.listAdminAuditEvents).toHaveBeenCalledWith(expect.objectContaining({ targetType: "backup_run" }));
  });

  it("在全流程入口阻断未登录和普通成员越权", async () => {
    const cases = [
      { caller: appRouter.createCaller(context(null)), expectedRole: null },
      { caller: appRouter.createCaller(context({ ...admin(), id: "member-e2e", role: "member" })), expectedRole: "member" },
    ] as const;
    for (const { caller, expectedRole } of cases) {
      const identity = await caller.auth.me();
      expect(identity?.role ?? null).toBe(expectedRole);
      await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.backups.schedules.runNow({ scheduleId, confirm: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.audit.list({ page: 1, pageSize: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(mocks.getAdminOverview).not.toHaveBeenCalled();
    expect(mocks.queueBackupRun).not.toHaveBeenCalled();
  });
});
