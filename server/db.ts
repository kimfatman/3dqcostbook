import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import { appUsers, auditEvents, type AppUser, type InsertUser, users, workspaceBooks, workspaceMembers, workspaces } from "../drizzle/schema";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) database = drizzle(process.env.DATABASE_URL);
  return database;
}

/** 兼容托管开发环境 SDK；外部服务器主认证使用 appUsers 与本地会话。 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function upsertUser(input: InsertUser) {
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: input.openId,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? null,
    role: input.role,
    lastSignedIn: input.lastSignedIn ?? new Date(),
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn },
  });
}

export async function getAppUserById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return rows[0];
}

export async function getAppUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(appUsers).where(eq(appUsers.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function hasAnyAppUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return (await db.select({ id: appUsers.id }).from(appUsers).limit(1)).length > 0;
}

export async function createInitialAdmin(input: { email: string; name: string; passwordHash: string; workspaceName: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const userId = randomUUID();
  const workspaceId = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(appUsers).values({ id: userId, email: input.email.toLowerCase(), name: input.name, passwordHash: input.passwordHash, role: "admin" });
    await tx.insert(workspaces).values({ id: workspaceId, name: input.workspaceName, ownerId: userId });
    await tx.insert(workspaceMembers).values({ workspaceId, userId, role: "owner" });
    await tx.insert(workspaceBooks).values({ workspaceId, state: {}, updatedByUserId: userId });
    await tx.insert(auditEvents).values({ id: randomUUID(), workspaceId, actorUserId: userId, action: "workspace.bootstrap", targetType: "workspace", targetId: workspaceId, details: { source: "bootstrap" } });
  });
  return { userId, workspaceId };
}

export async function markSignedIn(userId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(appUsers).set({ lastSignedInAt: new Date() }).where(eq(appUsers.id, userId));
}

export async function listWorkspacesForUser(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.role, updatedAt: workspaces.updatedAt })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

export async function getWorkspaceBook(workspaceId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ book: workspaceBooks, role: workspaceMembers.role })
    .from(workspaceBooks)
    .innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, workspaceBooks.workspaceId), eq(workspaceMembers.userId, userId)))
    .where(eq(workspaceBooks.workspaceId, workspaceId)).limit(1);
  return rows[0];
}

export async function saveWorkspaceBook(input: { workspaceId: string; userId: string; expectedRevision: number; schemaVersion: number; state: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const accessible = await getWorkspaceBook(input.workspaceId, input.userId);
  if (!accessible) throw new Error("Workspace not found or access denied");
  if (accessible.role === "viewer") throw new Error("Viewer cannot modify this workspace");
  if (accessible.book.revision !== input.expectedRevision) return { conflict: true as const, revision: accessible.book.revision, updatedAt: accessible.book.updatedAt };
  const nextRevision = input.expectedRevision + 1;
  await db.transaction(async tx => {
    await tx.update(workspaceBooks).set({ state: input.state, schemaVersion: input.schemaVersion, revision: nextRevision, updatedByUserId: input.userId, updatedAt: new Date() }).where(and(eq(workspaceBooks.workspaceId, input.workspaceId), eq(workspaceBooks.revision, input.expectedRevision)));
    await tx.update(workspaces).set({ updatedAt: new Date() }).where(eq(workspaces.id, input.workspaceId));
    await tx.insert(auditEvents).values({ id: randomUUID(), workspaceId: input.workspaceId, actorUserId: input.userId, action: "book.save", targetType: "workspace_book", targetId: input.workspaceId, details: { revision: nextRevision, schemaVersion: input.schemaVersion } });
  });
  return { conflict: false as const, revision: nextRevision };
}

export async function recentAuditEvents(workspaceId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const access = await getWorkspaceBook(workspaceId, userId);
  if (!access) throw new Error("Workspace not found or access denied");
  return db.select().from(auditEvents).where(eq(auditEvents.workspaceId, workspaceId)).orderBy(desc(auditEvents.createdAt)).limit(30);
}

export type LocalUser = Pick<AppUser, "id" | "email" | "name" | "role" | "createdAt" | "updatedAt" | "lastSignedInAt">;
