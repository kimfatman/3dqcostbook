import { count, max, sql } from "drizzle-orm";
import { appUsers, auditEvents, workspaceBooks, workspaces } from "../drizzle/schema";
import { getDb } from "./db";

const DEFAULT_APP_VERSION = "1.0.0";

function getAppVersion() {
  return process.env.npm_package_version || DEFAULT_APP_VERSION;
}

export type AdminHealth = {
  status: "ok" | "degraded";
  checkedAt: Date;
  checks: {
    database: { status: "ok" | "failed"; latencyMs?: number; error?: string };
  };
};

/**
 * 健康检查只返回运行状态、时间、耗时和固定的脱敏错误摘要。
 * 不返回连接串、环境变量、异常堆栈或第三方凭据。
 */
export async function getAdminHealth(): Promise<AdminHealth> {
  const checkedAt = new Date();
  const db = await getDb();
  if (!db) {
    return {
      status: "degraded",
      checkedAt,
      checks: { database: { status: "failed", error: "数据库服务不可用" } },
    };
  }

  const startedAt = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: "ok",
      checkedAt,
      checks: { database: { status: "ok", latencyMs: Date.now() - startedAt } },
    };
  } catch {
    return {
      status: "degraded",
      checkedAt,
      checks: { database: { status: "failed", latencyMs: Date.now() - startedAt, error: "数据库检查失败" } },
    };
  }
}

export function getAdminVersion() {
  return {
    version: getAppVersion(),
    schema: "drizzle-mysql",
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    generatedAt: new Date(),
  } as const;
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const [userCount, workspaceCount, auditEventCount, workspaceBookCount, latestBook] = await Promise.all([
    db.select({ count: count() }).from(appUsers),
    db.select({ count: count() }).from(workspaces),
    db.select({ count: count() }).from(auditEvents),
    db.select({ count: count() }).from(workspaceBooks),
    db.select({ updatedAt: max(workspaceBooks.updatedAt), schemaVersion: max(workspaceBooks.schemaVersion) }).from(workspaceBooks),
  ]);

  return {
    generatedAt: new Date(),
    version: getAppVersion(),
    counts: {
      users: userCount[0]?.count ?? 0,
      workspaces: workspaceCount[0]?.count ?? 0,
      auditEvents: auditEventCount[0]?.count ?? 0,
      workspaceBooks: workspaceBookCount[0]?.count ?? 0,
    },
    data: {
      latestWorkspaceBookUpdatedAt: latestBook[0]?.updatedAt ?? null,
      latestWorkspaceBookSchemaVersion: latestBook[0]?.schemaVersion ?? null,
    },
  } as const;
}
