import { bigint, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * 用户、工作区和账本事实的首期云端模型。
 * 账本快照是将现有 localStorage 原型安全迁移到云端的桥接层；所有金额仍由客户端领域模型以分为单位保存。
 */
export const appUsers = mysqlTable("app_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  avatarAssetId: varchar("avatarAssetId", { length: 36 }),
  avatarPreset: varchar("avatarPreset", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).notNull().default("member"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedInAt: timestamp("lastSignedInAt"),
}, table => [uniqueIndex("app_users_email_unique").on(table.email)]);

/** 兼容托管开发环境 SDK 的 OAuth 用户表；自建部署的主身份使用 appUsers。 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).notNull().default("user"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
}, table => [uniqueIndex("users_open_id_unique").on(table.openId)]);

export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  ownerId: varchar("ownerId", { length: 36 }).notNull(),
  industryId: varchar("industryId", { length: 40 }).notNull().default("restaurant"),
  contactName: varchar("contactName", { length: 120 }).notNull().default(""),
  logoAssetId: varchar("logoAssetId", { length: 36 }),
  logoPreset: varchar("logoPreset", { length: 32 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [index("workspaces_owner_idx").on(table.ownerId)]);

export const mediaAssets = mysqlTable("media_assets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull(),
  ownerUserId: varchar("ownerUserId", { length: 36 }).notNull(),
  kind: mysqlEnum("kind", ["user_avatar", "workspace_logo", "cost_card_image"]).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 80 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("media_assets_workspace_idx").on(table.workspaceId), index("media_assets_owner_idx").on(table.ownerUserId)]);

export const workspaceMembers = mysqlTable("workspace_members", {
  workspaceId: varchar("workspaceId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).notNull().default("viewer"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.workspaceId, table.userId], name: "workspace_members_pk" }), index("workspace_members_user_idx").on(table.userId)]);

export const workspaceBooks = mysqlTable("workspace_books", {
  workspaceId: varchar("workspaceId", { length: 36 }).primaryKey(),
  schemaVersion: int("schemaVersion").notNull().default(3),
  revision: int("revision").notNull().default(0),
  state: json("state").$type<Record<string, unknown>>().notNull(),
  updatedByUserId: varchar("updatedByUserId", { length: 36 }).notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const auditEvents = mysqlTable("audit_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull(),
  actorUserId: varchar("actorUserId", { length: 36 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 80 }),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("audit_events_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export type AppUser = typeof appUsers.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceBook = typeof workspaceBooks.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type MoneyFen = bigint;
