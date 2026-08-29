import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { calculateRetryDelay, claimNextBackupRun, classifyBackupError, completeBackupRun, createBackupIdempotencyKey, failOrRetryBackupRun } from "./backup-worker";

const dbMock = vi.hoisted(() => ({
  getDb: vi.fn(),
}));
vi.mock("./db", () => dbMock);

function updateBuilder(affectedRows = 1) {
  const where = vi.fn().mockResolvedValue([{ affectedRows }]);
  const set = vi.fn(() => ({ where }));
  return { set, where };
}

function selectBuilder(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  return { from, where, orderBy, limit };
}

function createDb(candidate?: Record<string, unknown>) {
  const builders = [updateBuilder(), updateBuilder(), updateBuilder()];
  const pendingUpdates = [...builders];
  const select = selectBuilder(candidate ? [candidate] : []);
  return {
    builders,
    db: {
      update: vi.fn(() => pendingUpdates.shift() ?? updateBuilder()),
      select: vi.fn(() => select),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    },
  };
}

describe("backup worker state machine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("classifies permanent and transient failures without exposing raw messages", () => {
    expect(classifyBackupError(new Error("COS request timed out"))).toEqual({ category: "storage_timeout", retryable: true, summary: "备份依赖服务超时" });
    expect(classifyBackupError(new Error("access denied for secret bucket"))).toEqual({ category: "permission_denied", retryable: false, summary: "存储或数据库权限不足" });
    expect(classifyBackupError(new Error("password=top-secret"))).toEqual({ category: "unknown", retryable: false, summary: "备份执行失败" });
  });

  it("calculates capped exponential delay with injectable jitter and stable idempotency keys", () => {
    expect(calculateRetryDelay(1, () => 0)).toBe(30_000);
    expect(calculateRetryDelay(10, () => 0)).toBe(1_800_000);
    expect(calculateRetryDelay(2, () => 0.5)).toBe(70_000);
    const window = new Date("2026-08-28T02:30:00.000Z");
    expect(createBackupIdempotencyKey("schedule-1", window)).toBe("schedule-1:2026-08-28T02:30:00.000Z");
  });

  it("claims only a queued run and writes a running lease with incremented attempt", async () => {
    const now = new Date("2026-08-28T00:00:00.000Z");
    const candidate = { id: "run-1", scheduleId: "schedule-1", status: "queued", attempt: 1, startedAt: null, nextAttemptAt: null, createdAt: now };
    const fake = createDb(candidate);
    dbMock.getDb.mockResolvedValue(fake.db);

    const claimed = await claimNextBackupRun({ workerId: "worker-1", now, leaseMs: 60_000 });

    expect(claimed).toMatchObject({ id: "run-1", status: "running", attempt: 2, workerId: "worker-1", leaseUntil: new Date("2026-08-28T00:01:00.000Z") });
    expect(fake.builders[0]?.set).toHaveBeenCalledWith(expect.objectContaining({ status: "running", attempt: 2, workerId: "worker-1" }));
    expect(fake.builders[0]?.where).toHaveBeenCalledOnce();
  });

  it("completes only the current worker lease", async () => {
    const fake = createDb();
    dbMock.getDb.mockResolvedValue(fake.db);

    await completeBackupRun({ runId: "run-1", workerId: "worker-1", bytesWritten: 123.9, completedAt: new Date("2026-08-28T00:02:00.000Z") });

    expect(fake.builders[0]?.set).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded", bytesWritten: 123, workerId: null, leaseUntil: null }));
    expect(fake.builders[0]?.where).toHaveBeenCalledOnce();
  });

  it("requeues transient failures and permanently fails after the attempt limit", async () => {
    const now = new Date("2026-08-28T00:00:00.000Z");
    const retryFake = createDb();
    dbMock.getDb.mockResolvedValue(retryFake.db);
    const retry = await failOrRetryBackupRun({ runId: "run-1", workerId: "worker-1", attempt: 1, error: new Error("request timeout"), now, maxAttempts: 3 });
    expect(retry.status).toBe("queued");
    expect(retryFake.builders[0]?.set).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", completedAt: null, workerId: null }));
    expect(retryFake.db.insert).toHaveBeenCalledOnce();

    const failedFake = createDb();
    dbMock.getDb.mockResolvedValue(failedFake.db);
    const failed = await failOrRetryBackupRun({ runId: "run-1", workerId: "worker-1", attempt: 3, error: new Error("permission denied"), now, maxAttempts: 3 });
    expect(failed).toMatchObject({ status: "failed", category: "permission_denied", retryable: false });
    expect(failedFake.builders[0]?.set).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", completedAt: now, errorSummary: "permission_denied: 存储或数据库权限不足" }));
  });
});
