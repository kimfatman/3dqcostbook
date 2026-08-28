import { boolean, bigint, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * 用户、工作区和账本事实的首期云端模型。
 * 账本快照是将现有 localStorage 原型安全迁移到云端的桥接层；所有金额仍由客户端领域模型以分为单位保存。
 */
export const appUsers = mysqlTable("app_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 320 }),
  phoneNumber: varchar("phoneNumber", { length: 24 }),
  cloudbaseSubject: varchar("cloudbaseSubject", { length: 128 }),
  name: varchar("name", { length: 120 }).notNull(),
  avatarAssetId: varchar("avatarAssetId", { length: 36 }),
  avatarPreset: varchar("avatarPreset", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).notNull().default("member"),
  status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedInAt: timestamp("lastSignedInAt"),
}, table => [
  uniqueIndex("app_users_email_unique").on(table.email),
  uniqueIndex("app_users_phone_unique").on(table.phoneNumber),
  uniqueIndex("app_users_cloudbase_subject_unique").on(table.cloudbaseSubject),
]);

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
  status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
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
  kind: mysqlEnum("kind", ["user_avatar", "workspace_logo", "cost_card_image", "record_voucher"]).notNull(),
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

/** 不绑定单一工作区的系统级管理员审计；details 只保存脱敏白名单。 */
export const adminAuditEvents = mysqlTable("admin_audit_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  actorUserId: varchar("actorUserId", { length: 36 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 80 }),
  outcome: mysqlEnum("outcome", ["success", "failure", "cancelled"]).notNull(),
  requestId: varchar("requestId", { length: 64 }),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("admin_audit_events_created_idx").on(table.createdAt), index("admin_audit_events_target_idx").on(table.targetType, table.targetId)]);

/** 版本化全局配置；payload 仅允许经过服务端白名单校验的非敏感配置。 */
export const globalConfigs = mysqlTable("global_configs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  configKey: varchar("configKey", { length: 80 }).notNull(),
  version: int("version").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  payload: json("payload").$type<Record<string, string | number | boolean | null>>().notNull(),
  changeSummary: varchar("changeSummary", { length: 240 }).notNull(),
  createdByUserId: varchar("createdByUserId", { length: 36 }).notNull(),
  publishedByUserId: varchar("publishedByUserId", { length: 36 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  publishedAt: timestamp("publishedAt"),
}, table => [uniqueIndex("global_configs_key_version_unique").on(table.configKey, table.version), index("global_configs_key_status_idx").on(table.configKey, table.status)]);

/** 账本结构迁移的审核记录；只记录审核元数据，不触发迁移执行。 */
export const adminMigrationReviews = mysqlTable("admin_migration_reviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  migrationId: varchar("migrationId", { length: 32 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  impactSummary: varchar("impactSummary", { length: 500 }).notNull(),
  rollbackPlan: varchar("rollbackPlan", { length: 500 }).notNull(),
  destructive: boolean("destructive").notNull().default(false),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  reviewedByUserId: varchar("reviewedByUserId", { length: 36 }),
  reviewNote: varchar("reviewNote", { length: 500 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [uniqueIndex("admin_migration_reviews_migration_unique").on(table.migrationId), index("admin_migration_reviews_status_idx").on(table.status)]);

export type AppUser = typeof appUsers.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceBook = typeof workspaceBooks.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
export type GlobalConfig = typeof globalConfigs.$inferSelect;
export type AdminMigrationReview = typeof adminMigrationReviews.$inferSelect;
export type MoneyFen = bigint;
