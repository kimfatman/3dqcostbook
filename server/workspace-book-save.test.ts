import { afterEach, describe, expect, it, vi } from "vitest";
import { setDatabaseForTesting, saveWorkspaceBook } from "./db";
import { auditEvents, workspaceBooks, workspaces } from "../drizzle/schema";

function bookAccess(revision: number) {
  return [{ book: { revision, updatedAt: new Date("2026-08-25T00:00:00.000Z") }, role: "editor" }];
}

function createSaveDbMock({ affectedRows, currentRevision = 8 }: { affectedRows: number; currentRevision?: number }) {
  const selections = [bookAccess(7), bookAccess(currentRevision)];
  const workspaceUpdateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
  const bookUpdateWhere = vi.fn().mockResolvedValue([{ affectedRows }, []]);
  const auditValues = vi.fn().mockResolvedValue(undefined);
  const tx = {
    update: vi.fn((table: unknown) => ({
      set: vi.fn().mockReturnValue({ where: table === workspaceBooks ? bookUpdateWhere : workspaceUpdateWhere }),
    })),
    insert: vi.fn((table: unknown) => {
      if (table !== auditEvents) throw new Error("Unexpected insert table");
      return { values: auditValues };
    }),
  };
  const db = {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockImplementation(async () => selections.shift() ?? []) }),
        }),
      }),
    })),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { db, tx, bookUpdateWhere, workspaceUpdateWhere, auditValues };
}

afterEach(() => setDatabaseForTesting(null));

describe("workspace book optimistic save", () => {
  it("returns the current revision and writes no workspace timestamp or audit event when the conditional update loses a race", async () => {
    const mocks = createSaveDbMock({ affectedRows: 0, currentRevision: 8 });
    setDatabaseForTesting(mocks.db as never);

    await expect(saveWorkspaceBook({ workspaceId: "workspace-1", userId: "user-1", expectedRevision: 7, schemaVersion: 1, state: { income: 100 } }))
      .resolves.toMatchObject({ conflict: true, revision: 8 });

    expect(mocks.bookUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mocks.workspaceUpdateWhere).not.toHaveBeenCalled();
    expect(mocks.auditValues).not.toHaveBeenCalled();
    expect(mocks.tx.update).toHaveBeenCalledWith(workspaceBooks);
    expect(mocks.tx.update).not.toHaveBeenCalledWith(workspaces);
  });

  it("updates the workspace clock and records an audit event only after exactly one matching book row changes", async () => {
    const mocks = createSaveDbMock({ affectedRows: 1 });
    setDatabaseForTesting(mocks.db as never);

    await expect(saveWorkspaceBook({ workspaceId: "workspace-1", userId: "user-1", expectedRevision: 7, schemaVersion: 1, state: { income: 100 } }))
      .resolves.toEqual({ conflict: false, revision: 8 });

    expect(mocks.workspaceUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mocks.auditValues).toHaveBeenCalledTimes(1);
  });
});
