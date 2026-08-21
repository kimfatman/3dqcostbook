import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import { appUsers, auditEvents, mediaAssets, type AppUser, type InsertUser, users, workspaceBooks, workspaceMembers, workspaces } from "../drizzle/schema";

let database: ReturnType<typeof drizzle> | null = null;

/** 仅供自动化回归替换数据库连接；生产路径不会调用。 */
export function setDatabaseForTesting(next: ReturnType<typeof drizzle> | null) {
  database = next;
}

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

export function preparePersonalWorkspaceRegistration(
  input: { email: string; name: string; passwordHash: string; workspaceName: string; industryId: string },
  ids = { userId: randomUUID(), workspaceId: randomUUID(), auditId: randomUUID() },
) {
  const userId = ids.userId;
  const workspaceId = ids.workspaceId;
  return {
    userId,
    workspaceId,
    user: { id: userId, email: input.email.toLowerCase(), name: input.name, passwordHash: input.passwordHash, role: "member" as const },
    workspace: { id: workspaceId, name: input.workspaceName, ownerId: userId, industryId: input.industryId, contactName: input.name },
    membership: { workspaceId, userId, role: "owner" as const },
    book: { workspaceId, state: {}, updatedByUserId: userId },
    audit: { id: ids.auditId, workspaceId, actorUserId: userId, action: "workspace.register", targetType: "workspace", targetId: workspaceId, details: { source: "public_registration", industryId: input.industryId } },
  };
}

export async function registerAndCreateWorkspace(input: { email: string; name: string; passwordHash: string; workspaceName: string; industryId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const registration = preparePersonalWorkspaceRegistration(input);
  await db.transaction(async tx => {
    await tx.insert(appUsers).values(registration.user);
    await tx.insert(workspaces).values(registration.workspace);
    await tx.insert(workspaceMembers).values(registration.membership);
    await tx.insert(workspaceBooks).values(registration.book);
    await tx.insert(auditEvents).values(registration.audit);
  });
  return { userId: registration.userId, workspaceId: registration.workspaceId };
}

export async function markSignedIn(userId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(appUsers).set({ lastSignedInAt: new Date() }).where(eq(appUsers.id, userId));
}

export async function listWorkspacesForUser(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select({ id: workspaces.id, name: workspaces.name, industryId: workspaces.industryId, contactName: workspaces.contactName, logoAssetId: workspaces.logoAssetId, role: workspaceMembers.role, updatedAt: workspaces.updatedAt })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

export async function getWorkspaceAccess(workspaceId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))).limit(1);
  return rows[0];
}

export async function updateAppUserProfile(userId: string, input: { name: string; avatarAssetId?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(appUsers).set({ name: input.name, avatarAssetId: input.avatarAssetId ?? null }).where(eq(appUsers.id, userId));
  return getAppUserById(userId);
}

export async function updateWorkspaceProfile(input: { workspaceId: string; userId: string; name: string; industryId: string; contactName: string; logoAssetId?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const access = await getWorkspaceAccess(input.workspaceId, input.userId);
  if (!access || access.role !== "owner") throw new Error("仅店铺 owner 可编辑店铺资料");
  await db.update(workspaces).set({ name: input.name, industryId: input.industryId, contactName: input.contactName, logoAssetId: input.logoAssetId ?? null, updatedAt: new Date() }).where(eq(workspaces.id, input.workspaceId));
  return getWorkspaceAccess(input.workspaceId, input.userId);
}

export async function createMediaAsset(input: { id: string; workspaceId: string; ownerUserId: string; kind: "user_avatar" | "workspace_logo" | "cost_card_image"; storageKey: string; mimeType: string; sizeBytes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(mediaAssets).values(input);
  return input;
}

export async function getMediaAssetForUser(assetId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ asset: mediaAssets })
    .from(mediaAssets)
    .innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, mediaAssets.workspaceId), eq(workspaceMembers.userId, userId)))
    .where(eq(mediaAssets.id, assetId)).limit(1);
  return rows[0]?.asset;
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

export type LocalUser = Pick<AppUser, "id" | "email" | "name" | "avatarAssetId" | "role" | "createdAt" | "updatedAt" | "lastSignedInAt">;
