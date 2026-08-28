import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { adminAuditEvents, backupRuns, backupSchedules, systemMetricSamples } from "../drizzle/schema";
import { getDb } from "./db";

export type BackupCadence = "daily" | "weekly";
export type BackupScheduleStatus = "enabled" | "paused";

export function getRuntimeMetrics() {
  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    heapUsedBytes: memory.heapUsed,
    heapTotalBytes: memory.heapTotal,
    rssBytes: memory.rss,
    nodeMajor: Number(process.versions.node.split(".")[0]),
  };
}

export async function listAdminMetricSamples(input: { page: number; pageSize: number; metricKey?: string; periodMinutes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const filters = [gte(systemMetricSamples.recordedAt, new Date(Date.now() - input.periodMinutes * 60_000))];
  if (input.metricKey) filters.push(eq(systemMetricSamples.metricKey, input.metricKey));
  const where = and(...filters);
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(systemMetricSamples).where(where),
    db.select({ id: systemMetricSamples.id, metricKey: systemMetricSamples.metricKey, value: systemMetricSamples.value, unit: systemMetricSamples.unit, recordedAt: systemMetricSamples.recordedAt })
      .from(systemMetricSamples).where(where).orderBy(desc(systemMetricSamples.recordedAt), asc(systemMetricSamples.id)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
  ]);
  return { page: input.page, pageSize: input.pageSize, total: totalRows[0]?.count ?? 0, items: rows };
}

export async function getAdminPerformanceSummary() {
  const db = await getDb();
  let database = "unavailable" as "ok" | "unavailable";
  let latestSamples: Array<{ metricKey: string; value: number; unit: string; recordedAt: Date }> = [];
  if (db) {
    const started = Date.now();
    await db.execute(sql`SELECT 1`);
    database = "ok";
    latestSamples = await db.select({ metricKey: systemMetricSamples.metricKey, value: systemMetricSamples.value, unit: systemMetricSamples.unit, recordedAt: systemMetricSamples.recordedAt })
      .from(systemMetricSamples).where(gte(systemMetricSamples.recordedAt, new Date(Date.now() - 24 * 60 * 60_000))).orderBy(desc(systemMetricSamples.recordedAt)).limit(50);
    latestSamples = latestSamples.map(sample => ({ ...sample, value: sample.metricKey === "database.latency_ms" ? Math.max(sample.value, Date.now() - started) : sample.value }));
  }
  return { generatedAt: new Date(), database, runtime: getRuntimeMetrics(), latestSamples };
}

export async function listBackupSchedules() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select({ id: backupSchedules.id, name: backupSchedules.name, cadence: backupSchedules.cadence, runAt: backupSchedules.runAt, timezone: backupSchedules.timezone, retentionDays: backupSchedules.retentionDays, status: backupSchedules.status, createdByUserId: backupSchedules.createdByUserId, createdAt: backupSchedules.createdAt, updatedAt: backupSchedules.updatedAt }).from(backupSchedules).orderBy(asc(backupSchedules.runAt), asc(backupSchedules.id));
}

export async function createBackupSchedule(input: { actorUserId: string; name: string; cadence: BackupCadence; runAt: string; timezone: string; retentionDays: number; requestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(backupSchedules).values({ id, name: input.name, cadence: input.cadence, runAt: input.runAt, timezone: input.timezone, retentionDays: input.retentionDays, status: "enabled", createdByUserId: input.actorUserId });
    await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "backup.schedule.create", targetType: "backup_schedule", targetId: id, outcome: "success", requestId: input.requestId, details: { cadence: input.cadence, runAt: input.runAt, retentionDays: input.retentionDays } });
  });
  return { id, status: "enabled" as const };
}

export async function setBackupScheduleStatus(input: { actorUserId: string; scheduleId: string; status: BackupScheduleStatus; requestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ id: backupSchedules.id, status: backupSchedules.status }).from(backupSchedules).where(eq(backupSchedules.id, input.scheduleId)).limit(1);
  const schedule = rows[0];
  if (!schedule) throw new Error("备份计划不存在");
  if (schedule.status === input.status) return { changed: false as const, status: schedule.status };
  await db.transaction(async tx => {
    await tx.update(backupSchedules).set({ status: input.status, updatedAt: new Date() }).where(eq(backupSchedules.id, input.scheduleId));
    await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "backup.schedule.status.change", targetType: "backup_schedule", targetId: input.scheduleId, outcome: "success", requestId: input.requestId, details: { from: schedule.status, to: input.status } });
  });
  return { changed: true as const, status: input.status };
}

export async function queueBackupRun(input: { actorUserId: string; scheduleId: string; requestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const schedules = await db.select({ id: backupSchedules.id, status: backupSchedules.status }).from(backupSchedules).where(eq(backupSchedules.id, input.scheduleId)).limit(1);
  const schedule = schedules[0];
  if (!schedule) throw new Error("备份计划不存在");
  if (schedule.status !== "enabled") throw new Error("暂停的备份计划不能排队执行");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(backupRuns).values({ id, scheduleId: input.scheduleId, status: "queued" });
    await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "backup.run.queue", targetType: "backup_run", targetId: id, outcome: "success", requestId: input.requestId, details: { scheduleId: input.scheduleId } });
  });
  return { id, scheduleId: input.scheduleId, status: "queued" as const };
}

export async function listBackupRuns(input: { page: number; pageSize: number; scheduleId?: string; status?: "queued" | "running" | "succeeded" | "failed" | "cancelled" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const filters = [];
  if (input.scheduleId) filters.push(eq(backupRuns.scheduleId, input.scheduleId));
  if (input.status) filters.push(eq(backupRuns.status, input.status));
  const where = filters.length ? and(...filters) : undefined;
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(backupRuns).where(where),
    db.select({ id: backupRuns.id, scheduleId: backupRuns.scheduleId, status: backupRuns.status, startedAt: backupRuns.startedAt, completedAt: backupRuns.completedAt, bytesWritten: backupRuns.bytesWritten, errorSummary: backupRuns.errorSummary, createdAt: backupRuns.createdAt }).from(backupRuns).where(where).orderBy(desc(backupRuns.createdAt), asc(backupRuns.id)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
  ]);
  return { page: input.page, pageSize: input.pageSize, total: totalRows[0]?.count ?? 0, items: rows.map(row => ({ ...row, errorSummary: row.errorSummary?.slice(0, 240) ?? null })) };
}
