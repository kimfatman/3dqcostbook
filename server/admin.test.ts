import { beforeEach, describe, expect, it } from "vitest";
import { getAdminHealth, getAdminOverview, getAdminVersion } from "./admin";
import { setDatabaseForTesting } from "./db";

describe("admin read-only service", () => {
  beforeEach(() => {
    setDatabaseForTesting(null);
  });

  it("returns a degraded, redacted health result when the database is unavailable", async () => {
    const result = await getAdminHealth();

    expect(result.status).toBe("degraded");
    expect(result.checks.database).toEqual({ status: "failed", error: "数据库服务不可用" });
    expect(JSON.stringify(result)).not.toMatch(/DATABASE_URL|password|token|secret|key/i);
  });

  it("does not claim overview success when the database is unavailable", async () => {
    await expect(getAdminOverview()).rejects.toThrow("Database is unavailable");
  });

  it("returns version metadata without environment values or credentials", () => {
    const result = getAdminVersion();

    expect(result).toMatchObject({ version: expect.any(String), schema: "drizzle-mysql", environment: expect.any(String) });
    expect(JSON.stringify(result)).not.toMatch(/DATABASE_URL|password|token|secret|credential|key/i);
  });
});
