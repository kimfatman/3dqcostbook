import { afterEach, describe, expect, it } from "vitest";
import { appUsers, auditEvents, workspaceBooks, workspaceMembers, workspaces } from "../drizzle/schema";
import { registerAndCreateWorkspace, setDatabaseForTesting } from "./db";

type Insert = { table: unknown; value: Record<string, unknown> };

function createTransactionalMemoryDb(failOn?: unknown) {
  const committed: Insert[] = [];
  const db = {
    transaction: async (callback: (tx: { insert: (table: unknown) => { values: (value: Record<string, unknown>) => Promise<void> } }) => Promise<void>) => {
      const pending: Insert[] = [];
      const tx = {
        insert: (table: unknown) => ({
          values: async (value: Record<string, unknown>) => {
            if (table === failOn) throw new Error("simulated write failure");
            pending.push({ table, value });
          },
        }),
      };
      await callback(tx);
      committed.push(...pending);
    },
  };
  return { db, committed };
}

afterEach(() => setDatabaseForTesting(null));

describe("registerAndCreateWorkspace transaction", () => {
  it("persists the new user, personally-owned workspace, empty book and audit event as one linked transaction", async () => {
    const memory = createTransactionalMemoryDb();
    setDatabaseForTesting(memory.db as never);

    const result = await registerAndCreateWorkspace({
      email: "owner@example.com",
      name: "陈晨",
      passwordHash: "scrypt$already-hashed",
      workspaceName: "晨光零售",
      industryId: "retail",
    });

    expect(memory.committed).toHaveLength(5);
    const user = memory.committed.find(item => item.table === appUsers)?.value;
    const workspace = memory.committed.find(item => item.table === workspaces)?.value;
    const member = memory.committed.find(item => item.table === workspaceMembers)?.value;
    const book = memory.committed.find(item => item.table === workspaceBooks)?.value;
    const audit = memory.committed.find(item => item.table === auditEvents)?.value;

    expect(user).toMatchObject({ id: result.userId, email: "owner@example.com", role: "member" });
    expect(workspace).toMatchObject({ id: result.workspaceId, ownerId: result.userId, industryId: "retail" });
    expect(member).toEqual({ workspaceId: result.workspaceId, userId: result.userId, role: "owner" });
    expect(book).toEqual({ workspaceId: result.workspaceId, state: {}, updatedByUserId: result.userId });
    expect(audit).toMatchObject({ workspaceId: result.workspaceId, actorUserId: result.userId, targetId: result.workspaceId, action: "workspace.register" });
  });

  it("commits no orphan user, workspace, member, book or audit data when any registration write fails", async () => {
    const memory = createTransactionalMemoryDb(workspaceBooks);
    setDatabaseForTesting(memory.db as never);

    await expect(registerAndCreateWorkspace({
      email: "rollback@example.com",
      name: "陈晨",
      passwordHash: "scrypt$already-hashed",
      workspaceName: "晨光零售",
      industryId: "retail",
    })).rejects.toThrow("simulated write failure");

    expect(memory.committed).toEqual([]);
  });
});
