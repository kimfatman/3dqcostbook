import { and, asc, count, desc, eq, max, like } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { adminAuditEvents, adminMigrationReviews, globalConfigs } from "../drizzle/schema";
import { getDb } from "./db";
import { recordAdminAudit } from "./admin-data";

const SENSITIVE_KEYS = /password|secret|token|verification|authorization|cookie|credential|connection|string|key/i;

type PageInput = { page: number; pageSize: number };

function offset(input: PageInput) {
  return (input.page - 1) * input.pageSize;
}

function redactDetails(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (item && typeof item === "object" && !Array.isArray(item)) output[key] = redactDetails(item);
    else if (typeof item === "string") output[key] = item.slice(0, 240);
    else if (["number", "boolean"].includes(typeof item) || item === null) output[key] = item;
  }
  return output;
}

export async function listAdminAuditEvents(input: PageInput & { action?: string; outcome?: "success" | "failure" | "cancelled"; targetType?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const filters = [];
  if (input.action) filters.push(eq(adminAuditEvents.action, input.action));
  if (input.outcome) filters.push(eq(adminAuditEvents.outcome, input.outcome));
  if (input.targetType) filters.push(eq(adminAuditEvents.targetType, input.targetType));
  const where = filters.length ? and(...filters) : undefined;
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(adminAuditEvents).where(where),
    db.select().from(adminAuditEvents).where(where).orderBy(desc(adminAuditEvents.createdAt), asc(adminAuditEvents.id)).limit(input.pageSize).offset(offset(input)),
  ]);
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: totalRows[0]?.count ?? 0,
    items: rows.map(row => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      outcome: row.outcome,
      requestId: row.requestId,
      details: redactDetails(row.details),
      createdAt: row.createdAt,
    })),
  };
}

export async function listMigrationReviews(input: PageInput & { status?: "pending" | "approved" | "rejected" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const where = input.status ? eq(adminMigrationReviews.status, input.status) : undefined;
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(adminMigrationReviews).where(where),
    db.select().from(adminMigrationReviews).where(where).orderBy(desc(adminMigrationReviews.updatedAt), asc(adminMigrationReviews.migrationId)).limit(input.pageSize).offset(offset(input)),
  ]);
  return { page: input.page, pageSize: input.pageSize, total: totalRows[0]?.count ?? 0, items: rows };
}

export async function reviewMigration(input: {
  actorUserId: string;
  migrationId: string;
  title: string;
  impactSummary: string;
  rollbackPlan: string;
  destructive: boolean;
  status: "approved" | "rejected";
  reviewNote?: string;
  requestId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const currentRows = await db.select().from(adminMigrationReviews).where(eq(adminMigrationReviews.migrationId, input.migrationId)).limit(1);
  const current = currentRows[0];
  try {
    if (current) {
      await db.transaction(async tx => {
        await tx.update(adminMigrationReviews).set({
          title: input.title, impactSummary: input.impactSummary, rollbackPlan: input.rollbackPlan,
          destructive: input.destructive, status: input.status, reviewedByUserId: input.actorUserId,
          reviewNote: input.reviewNote ?? null, updatedAt: new Date(),
        }).where(eq(adminMigrationReviews.id, current.id));
        await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "migration.review", targetType: "migration", targetId: input.migrationId, outcome: "success", requestId: input.requestId, details: { status: input.status, destructive: input.destructive } });
      });
    } else {
      await db.transaction(async tx => {
        await tx.insert(adminMigrationReviews).values({
          id: randomUUID(), migrationId: input.migrationId, title: input.title, impactSummary: input.impactSummary,
          rollbackPlan: input.rollbackPlan, destructive: input.destructive, status: input.status,
          reviewedByUserId: input.actorUserId, reviewNote: input.reviewNote ?? null,
        });
        await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "migration.review", targetType: "migration", targetId: input.migrationId, outcome: "success", requestId: input.requestId, details: { status: input.status, destructive: input.destructive } });
      });
    }
  } catch (error) {
    try { await recordAdminAudit({ actorUserId: input.actorUserId, action: "migration.review", targetType: "migration", targetId: input.migrationId, outcome: "failure", requestId: input.requestId, details: { reason: "review write failed" } }); } catch { /* 不覆盖原始错误 */ }
    throw error;
  }
  return { migrationId: input.migrationId, status: input.status } as const;
}

export async function listGlobalConfigs(input: PageInput & { configKey?: string; status?: "draft" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const filters = [];
  if (input.configKey) filters.push(eq(globalConfigs.configKey, input.configKey));
  if (input.status) filters.push(eq(globalConfigs.status, input.status));
  const where = filters.length ? and(...filters) : undefined;
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(globalConfigs).where(where),
    db.select({ id: globalConfigs.id, configKey: globalConfigs.configKey, version: globalConfigs.version, status: globalConfigs.status, payload: globalConfigs.payload, changeSummary: globalConfigs.changeSummary, createdByUserId: globalConfigs.createdByUserId, publishedByUserId: globalConfigs.publishedByUserId, createdAt: globalConfigs.createdAt, updatedAt: globalConfigs.updatedAt, publishedAt: globalConfigs.publishedAt }).from(globalConfigs).where(where).orderBy(desc(globalConfigs.updatedAt), asc(globalConfigs.configKey), desc(globalConfigs.version)).limit(input.pageSize).offset(offset(input)),
  ]);
  return { page: input.page, pageSize: input.pageSize, total: totalRows[0]?.count ?? 0, items: rows.map(row => ({ ...row, payload: redactDetails(row.payload) ?? {} })) };
}

export async function saveGlobalConfigDraft(input: { actorUserId: string; configKey: string; payload: Record<string, string | number | boolean | null>; changeSummary: string; requestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (Object.keys(input.payload).some(key => SENSITIVE_KEYS.test(key))) throw new Error("配置不能包含敏感字段");
  const versionRows = await db.select({ version: max(globalConfigs.version) }).from(globalConfigs).where(eq(globalConfigs.configKey, input.configKey));
  const version = (versionRows[0]?.version ?? 0) + 1;
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(globalConfigs).values({ id, configKey: input.configKey, version, status: "draft", payload: input.payload, changeSummary: input.changeSummary, createdByUserId: input.actorUserId });
    await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "config.draft.create", targetType: "config", targetId: id, outcome: "success", requestId: input.requestId, details: { configKey: input.configKey, version } });
  });
  return { id, configKey: input.configKey, version, status: "draft" as const };
}

export async function publishGlobalConfig(input: { actorUserId: string; configId: string; requestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ id: globalConfigs.id, configKey: globalConfigs.configKey, version: globalConfigs.version, status: globalConfigs.status }).from(globalConfigs).where(eq(globalConfigs.id, input.configId)).limit(1);
  const target = rows[0];
  if (!target) throw new Error("配置版本不存在");
  if (target.status !== "draft") throw new Error("只有草稿配置可以发布");
  try {
    await db.transaction(async tx => {
      await tx.update(globalConfigs).set({ status: "archived", updatedAt: new Date() }).where(and(eq(globalConfigs.configKey, target.configKey), eq(globalConfigs.status, "published")));
      await tx.update(globalConfigs).set({ status: "published", publishedByUserId: input.actorUserId, publishedAt: new Date(), updatedAt: new Date() }).where(and(eq(globalConfigs.id, target.id), eq(globalConfigs.status, "draft")));
      await tx.insert(adminAuditEvents).values({ id: randomUUID(), actorUserId: input.actorUserId, action: "config.publish", targetType: "config", targetId: target.id, outcome: "success", requestId: input.requestId, details: { configKey: target.configKey, version: target.version } });
    });
  } catch (error) {
    try { await recordAdminAudit({ actorUserId: input.actorUserId, action: "config.publish", targetType: "config", targetId: input.configId, outcome: "failure", requestId: input.requestId, details: { reason: "publish failed" } }); } catch { /* 不覆盖原始错误 */ }
    throw error;
  }
  return { id: target.id, configKey: target.configKey, version: target.version, status: "published" as const };
}
