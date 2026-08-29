import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { adminAuditEvents, appUsers, workspaceBooks, workspaceMembers, workspaces } from "../drizzle/schema";
import { getDb } from "./db";

export type AdminStatus = "active" | "suspended";

export type AdminListInput = {
  page: number;
  pageSize: number;
  query?: string;
  status?: AdminStatus;
};

function pageOffset(input: AdminListInput) {
  return (input.page - 1) * input.pageSize;
}

function normalizedQuery(query?: string) {
  const value = query?.trim();
  return value ? `%${value.replace(/[%_]/g, "\\$&").slice(0, 80)}%` : undefined;
}

function maskEmail(email: string | null) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local?.slice(0, 1) ?? "*")}***@${domain}`;
}

function maskPhone(phoneNumber: string | null) {
  if (!phoneNumber) return null;
  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
}

function userWhere(input: AdminListInput) {
  const filters = [];
  const query = normalizedQuery(input.query);
  if (query) filters.push(or(like(appUsers.name, query), like(appUsers.email, query), like(appUsers.phoneNumber, query)));
  if (input.status) filters.push(eq(appUsers.status, input.status));
  return filters.length ? and(...filters) : undefined;
}

function workspaceWhere(input: AdminListInput) {
  const filters = [];
  const query = normalizedQuery(input.query);
  if (query) filters.push(or(like(workspaces.name, query), like(appUsers.name, query), like(appUsers.email, query)));
  if (input.status) filters.push(eq(workspaces.status, input.status));
  return filters.length ? and(...filters) : undefined;
}

export async function listAdminUsers(input: AdminListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const where = userWhere(input);
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(appUsers).where(where),
    db.select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      phoneNumber: appUsers.phoneNumber,
      role: appUsers.role,
      status: appUsers.status,
      cloudbaseLinked: sql<boolean>`${appUsers.cloudbaseSubject} IS NOT NULL`,
      workspaceCount: count(workspaces.id),
      createdAt: appUsers.createdAt,
      lastSignedInAt: appUsers.lastSignedInAt,
    })
      .from(appUsers)
      .leftJoin(workspaces, eq(workspaces.ownerId, appUsers.id))
      .where(where)
      .groupBy(appUsers.id, appUsers.name, appUsers.email, appUsers.phoneNumber, appUsers.role, appUsers.status, appUsers.cloudbaseSubject, appUsers.createdAt, appUsers.lastSignedInAt)
      .orderBy(desc(appUsers.createdAt), asc(appUsers.id))
      .limit(input.pageSize)
      .offset(pageOffset(input)),
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total: totalRows[0]?.count ?? 0,
    items: rows.map(row => ({
      id: row.id,
      name: row.name,
      email: maskEmail(row.email),
      phoneNumber: maskPhone(row.phoneNumber),
      role: row.role,
      status: row.status,
      cloudbaseLinked: Boolean(row.cloudbaseLinked),
      workspaceCount: row.workspaceCount,
      createdAt: row.createdAt,
      lastSignedInAt: row.lastSignedInAt,
    })),
  };
}

export async function listAdminWorkspaces(input: AdminListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const where = workspaceWhere(input);
  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(workspaces).leftJoin(appUsers, eq(appUsers.id, workspaces.ownerId)).where(where),
    db.select({
      id: workspaces.id,
      name: workspaces.name,
      industryId: workspaces.industryId,
      status: workspaces.status,
      ownerId: workspaces.ownerId,
      ownerName: appUsers.name,
      ownerEmail: appUsers.email,
      memberCount: count(workspaceMembers.userId),
      bookRevision: workspaceBooks.revision,
      bookSchemaVersion: workspaceBooks.schemaVersion,
      bookUpdatedAt: workspaceBooks.updatedAt,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
      .from(workspaces)
      .leftJoin(appUsers, eq(appUsers.id, workspaces.ownerId))
      .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(workspaceBooks, eq(workspaceBooks.workspaceId, workspaces.id))
      .where(where)
      .groupBy(workspaces.id, workspaces.name, workspaces.industryId, workspaces.status, workspaces.ownerId, appUsers.name, appUsers.email, workspaceBooks.revision, workspaceBooks.schemaVersion, workspaceBooks.updatedAt, workspaces.createdAt, workspaces.updatedAt)
      .orderBy(desc(workspaces.updatedAt), asc(workspaces.id))
      .limit(input.pageSize)
      .offset(pageOffset(input)),
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total: totalRows[0]?.count ?? 0,
    items: rows.map(row => ({
      id: row.id,
      name: row.name,
      industryId: row.industryId,
      status: row.status,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      ownerEmail: maskEmail(row.ownerEmail),
      memberCount: row.memberCount,
      book: row.bookRevision === null ? null : { revision: row.bookRevision, schemaVersion: row.bookSchemaVersion, updatedAt: row.bookUpdatedAt },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function recordAdminAudit(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: "success" | "failure" | "cancelled";
  requestId?: string;
  details?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(adminAuditEvents).values({ id: randomUUID(), ...input });
}

async function countActiveAdmins(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const rows = await db.select({ count: count() }).from(appUsers).where(eq(appUsers.role, "admin"));
  return rows[0]?.count ?? 0;
}

export async function setAdminUserStatus(input: {
  actorUserId: string;
  targetUserId: string;
  status: AdminStatus;
  reason: string;
  requestId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (input.actorUserId === input.targetUserId && input.status === "suspended") throw new Error("不能停用当前管理员账号");
  const targetRows = await db.select({ id: appUsers.id, role: appUsers.role, status: appUsers.status }).from(appUsers).where(eq(appUsers.id, input.targetUserId)).limit(1);
  const target = targetRows[0];
  if (!target) throw new Error("用户不存在");
  if (target.status === input.status) return { changed: false as const, status: target.status };
  if (target.role === "admin" && input.status === "suspended" && await countActiveAdmins(db) <= 1) throw new Error("不能停用最后一个管理员");

  try {
    await db.transaction(async tx => {
      await tx.update(appUsers).set({ status: input.status, updatedAt: new Date() }).where(eq(appUsers.id, input.targetUserId));
      await tx.insert(adminAuditEvents).values({
        id: randomUUID(), actorUserId: input.actorUserId, action: "user.status.change", targetType: "user", targetId: input.targetUserId,
        outcome: "success", requestId: input.requestId, details: { from: target.status, to: input.status, reason: input.reason.slice(0, 240) },
      });
    });
  } catch (error) {
    try { await recordAdminAudit({ actorUserId: input.actorUserId, action: "user.status.change", targetType: "user", targetId: input.targetUserId, outcome: "failure", requestId: input.requestId, details: { reason: "status update failed" } }); } catch { /* 审计失败不得覆盖原始错误 */ }
    throw error;
  }
  return { changed: true as const, status: input.status };
}

export async function setAdminWorkspaceStatus(input: {
  actorUserId: string;
  workspaceId: string;
  status: AdminStatus;
  reason: string;
  requestId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const targetRows = await db.select({ id: workspaces.id, status: workspaces.status }).from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
  const target = targetRows[0];
  if (!target) throw new Error("工作区不存在");
  if (target.status === input.status) return { changed: false as const, status: target.status };

  try {
    await db.transaction(async tx => {
      await tx.update(workspaces).set({ status: input.status, updatedAt: new Date() }).where(eq(workspaces.id, input.workspaceId));
      await tx.insert(adminAuditEvents).values({
        id: randomUUID(), actorUserId: input.actorUserId, action: "workspace.status.change", targetType: "workspace", targetId: input.workspaceId,
        outcome: "success", requestId: input.requestId, details: { from: target.status, to: input.status, reason: input.reason.slice(0, 240) },
      });
    });
  } catch (error) {
    try { await recordAdminAudit({ actorUserId: input.actorUserId, action: "workspace.status.change", targetType: "workspace", targetId: input.workspaceId, outcome: "failure", requestId: input.requestId, details: { reason: "status update failed" } }); } catch { /* 审计失败不得覆盖原始错误 */ }
    throw error;
  }
  return { changed: true as const, status: input.status };
}
