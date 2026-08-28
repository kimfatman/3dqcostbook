import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getAdminPerformanceSummary: vi.fn(),
  getRuntimeMetrics: vi.fn(),
  listAdminMetricSamples: vi.fn(),
  listBackupSchedules: vi.fn(),
  createBackupSchedule: vi.fn(),
  setBackupScheduleStatus: vi.fn(),
  queueBackupRun: vi.fn(),
  listBackupRuns: vi.fn(),
}));

vi.mock("./admin-operations-data", () => mocks);

type User = NonNullable<TrpcContext["user"]>;
function ctx(user: User | null): TrpcContext { return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
function admin(): User {
  const date = new Date("2026-08-28T00:00:00.000Z");
  return { id: "admin-1", email: "admin@example.com", phoneNumber: null, cloudbaseSubject: null, name: "管理员", avatarAssetId: null, avatarPreset: null, passwordHash: "redacted", role: "admin", status: "active", createdAt: date, updatedAt: date, lastSignedInAt: date };
}

describe("admin monitoring and backup routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminPerformanceSummary.mockResolvedValue({ database: "ok", runtime: { uptimeSeconds: 1, heapUsedBytes: 2, heapTotalBytes: 3, rssBytes: 4, nodeMajor: 22 }, latestSamples: [] });
    mocks.getRuntimeMetrics.mockReturnValue({ uptimeSeconds: 1, heapUsedBytes: 2, heapTotalBytes: 3, rssBytes: 4, nodeMajor: 22 });
    mocks.listAdminMetricSamples.mockResolvedValue({ page: 1, pageSize: 50, total: 0, items: [] });
    mocks.listBackupSchedules.mockResolvedValue([]);
    mocks.listBackupRuns.mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] });
    mocks.createBackupSchedule.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", status: "enabled" });
    mocks.setBackupScheduleStatus.mockResolvedValue({ changed: true, status: "paused" });
    mocks.queueBackupRun.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000002", scheduleId: "00000000-0000-4000-8000-000000000001", status: "queued" });
  });

  it("allows an admin to read runtime and paginated performance data", async () => {
    const caller = appRouter.createCaller(ctx(admin()));
    await caller.admin.metrics.summary();
    await caller.admin.metrics.runtime();
    await caller.admin.metrics.list({ page: 2, pageSize: 25, metricKey: "database.latency_ms", periodMinutes: 60 });
    expect(mocks.getAdminPerformanceSummary).toHaveBeenCalledOnce();
    expect(mocks.getRuntimeMetrics).toHaveBeenCalledOnce();
    expect(mocks.listAdminMetricSamples).toHaveBeenCalledWith({ page: 2, pageSize: 25, metricKey: "database.latency_ms", periodMinutes: 60 });
  });

  it("validates backup schedule inputs and requires confirmation for mutations", async () => {
    const caller = appRouter.createCaller(ctx(admin()));
    const schedule = { name: "每日备份", cadence: "daily" as const, runAt: "02:30", timezone: "Asia/Shanghai", retentionDays: 30 };
    await expect(caller.admin.backups.schedules.create(schedule)).rejects.toThrow("二次确认");
    await expect(caller.admin.backups.schedules.create({ ...schedule, confirm: true, runAt: "2:30" })).rejects.toThrow();
    await caller.admin.backups.schedules.create({ ...schedule, confirm: true });
    expect(mocks.createBackupSchedule).toHaveBeenCalledWith({ ...schedule, confirm: true, actorUserId: "admin-1" });

    const scheduleId = "00000000-0000-4000-8000-000000000001";
    await expect(caller.admin.backups.schedules.runNow({ scheduleId })).rejects.toThrow("二次确认");
    await caller.admin.backups.schedules.runNow({ scheduleId, confirm: true });
    expect(mocks.queueBackupRun).toHaveBeenCalledWith({ scheduleId, confirm: true, actorUserId: "admin-1" });
  });

  it("rejects non-admin access to monitoring and backup operations", async () => {
    const member = { ...admin(), role: "member" as const };
    for (const caller of [appRouter.createCaller(ctx(null)), appRouter.createCaller(ctx(member))]) {
      await expect(caller.admin.metrics.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.backups.schedules.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.backups.runs({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(mocks.getAdminPerformanceSummary).not.toHaveBeenCalled();
    expect(mocks.listBackupSchedules).not.toHaveBeenCalled();
    expect(mocks.listBackupRuns).not.toHaveBeenCalled();
  });
});
