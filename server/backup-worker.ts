import { and, asc, count, eq, isNull, lte, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { adminAuditEvents, backupRuns } from "../drizzle/schema";
import { getDb } from "./db";

export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_LEASE_MS = 15 * 60_000;

export type BackupFailureClass = "database_unavailable" | "storage_timeout" | "storage_rate_limited" | "checksum_mismatch" | "permission_denied" | "invalid_configuration" | "quota_exceeded" | "worker_crashed" | "unknown";

export function classifyBackupError(error: unknown): { category: BackupFailureClass; retryable: boolean; summary: string } {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (/permission|forbidden|access denied|unauthorized/.test(normalized)) return { category: "permission_denied", retryable: false, summary: "存储或数据库权限不足" };
  if (/checksum|hash|integrity|corrupt|empty backup/.test(normalized)) return { category: "checksum_mismatch", retryable: true, summary: "备份产物校验失败" };
  if (/quota|disk full|no space/.test(normalized)) return { category: "quota_exceeded", retryable: false, summary: "存储配额不足" };
  if (/invalid|unsupported|configuration|timezone|parameter/.test(normalized)) return { category: "invalid_configuration", retryable: false, summary: "备份配置无效" };
  if (/rate limit|too many requests|429/.test(normalized)) return { category: "storage_rate_limited", retryable: true, summary: "存储服务暂时限流" };
  if (/timeout|timed out|etimedout/.test(normalized)) return { category: "storage_timeout", retryable: true, summary: "备份依赖服务超时" };
  if (/database|mysql|connection|econnrefused|pool/.test(normalized)) return { category: "database_unavailable", retryable: true, summary: "数据库服务暂时不可用" };
  if (/sigterm|oom|killed|worker/.test(normalized)) return { category: "worker_crashed", retryable: true, summary: "备份 worker 中断" };
  return { category: "unknown", retryable: false, summary: "备份执行失败" };
}

export function calculateRetryDelay(attempt: number, random = Math.random) {
  const exponential = Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
  return exponential + Math.floor(random() * 20_000);
}

export function createBackupIdempotencyKey(scheduleId: string, windowStart: Date) {
  return `${scheduleId}:${windowStart.toISOString()}`;
}

function safeErrorSummary(category: BackupFailureClass, summary: string) {
  return `${category}: ${summary}`.slice(0, 240);
}

async function writeWorkerAudit(input: { actorUserId: string; action: string; targetId: string; outcome: "success" | "failure"; details: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: "system-worker", action: input.action, targetType: "backup_run", targetId: input.targetId, outcome: input.outcome, details: { ...input.details, workerId: input.actorUserId } });
}

export async function recoverExpiredBackupRuns(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.update(backupRuns).set({ status: "queued", nextAttemptAt: now, leaseUntil: null, workerId: null, errorSummary: "worker_crashed: 租约已过期" }).where(and(eq(backupRuns.status, "running"), lte(backupRuns.leaseUntil, now)));
  return Number(result[0]?.affectedRows ?? 0);
}

export async function claimNextBackupRun(input: { workerId: string; now?: Date; leaseMs?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const now = input.now ?? new Date();
  const candidates = await db.select().from(backupRuns)
    .where(and(eq(backupRuns.status, "queued"), or(isNull(backupRuns.nextAttemptAt), lte(backupRuns.nextAttemptAt, now))))
    .orderBy(asc(backupRuns.nextAttemptAt), asc(backupRuns.createdAt), asc(backupRuns.id)).limit(10);
  for (const candidate of candidates) {
    const result = await db.update(backupRuns).set({ status: "running", attempt: candidate.attempt + 1, startedAt: candidate.startedAt ?? now, leaseUntil: new Date(now.getTime() + (input.leaseMs ?? DEFAULT_LEASE_MS)), workerId: input.workerId, errorSummary: null }).where(and(eq(backupRuns.id, candidate.id), eq(backupRuns.status, "queued"), or(isNull(backupRuns.nextAttemptAt), lte(backupRuns.nextAttemptAt, now))));
    if (Number(result[0]?.affectedRows ?? 0) === 1) return { ...candidate, status: "running" as const, attempt: candidate.attempt + 1, startedAt: candidate.startedAt ?? now, leaseUntil: new Date(now.getTime() + (input.leaseMs ?? DEFAULT_LEASE_MS)), workerId: input.workerId };
  }
  return null;
}

export async function completeBackupRun(input: { runId: string; workerId: string; bytesWritten: number; completedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const completedAt = input.completedAt ?? new Date();
  const result = await db.update(backupRuns).set({ status: "succeeded", bytesWritten: Math.max(0, Math.floor(input.bytesWritten)), completedAt, leaseUntil: null, workerId: null, errorSummary: null }).where(and(eq(backupRuns.id, input.runId), eq(backupRuns.status, "running"), eq(backupRuns.workerId, input.workerId)));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("备份任务租约已失效");
  return { status: "succeeded" as const, completedAt };
}

export async function failOrRetryBackupRun(input: { runId: string; workerId: string; attempt: number; error: unknown; now?: Date; maxAttempts?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const now = input.now ?? new Date();
  const failure = classifyBackupError(input.error);
  const canRetry = failure.retryable && input.attempt < (input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const nextAttemptAt = canRetry ? new Date(now.getTime() + calculateRetryDelay(input.attempt)) : null;
  const status = canRetry ? "queued" : "failed";
  const result = await db.update(backupRuns).set({ status, nextAttemptAt, completedAt: canRetry ? null : now, leaseUntil: null, workerId: null, errorSummary: safeErrorSummary(failure.category, failure.summary) }).where(and(eq(backupRuns.id, input.runId), eq(backupRuns.status, "running"), eq(backupRuns.workerId, input.workerId)));
  if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("备份任务租约已失效");
  await writeWorkerAudit({ actorUserId: input.workerId, action: canRetry ? "backup.run.retry" : "backup.run.failed", targetId: input.runId, outcome: canRetry ? "success" : "failure", details: { category: failure.category, attempt: input.attempt, nextAttemptAt: nextAttemptAt?.toISOString() ?? null } });
  return { status, category: failure.category, retryable: canRetry, nextAttemptAt } as const;
}

export type BackupExecutor = (run: { id: string; scheduleId: string; attempt: number }) => Promise<{ bytesWritten: number }>;

export async function runBackupWorkerOnce(input: { workerId: string; execute: BackupExecutor; now?: Date; leaseMs?: number; maxAttempts?: number }) {
  await recoverExpiredBackupRuns(input.now);
  const run = await claimNextBackupRun({ workerId: input.workerId, now: input.now, leaseMs: input.leaseMs });
  if (!run) return { status: "idle" as const };
  try {
    const result = await input.execute({ id: run.id, scheduleId: run.scheduleId, attempt: run.attempt });
    await completeBackupRun({ runId: run.id, workerId: input.workerId, bytesWritten: result.bytesWritten, completedAt: input.now });
    return { status: "succeeded" as const, runId: run.id };
  } catch (error) {
    const outcome = await failOrRetryBackupRun({ runId: run.id, workerId: input.workerId, attempt: run.attempt, error, now: input.now, maxAttempts: input.maxAttempts });
    return { status: outcome.status, runId: run.id, category: outcome.category, nextAttemptAt: outcome.nextAttemptAt };
  }
}
