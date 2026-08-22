import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAppUserByEmail: vi.fn(),
  getWorkspaceBook: vi.fn(),
  hasAnyAppUsers: vi.fn(),
  listWorkspacesForUser: vi.fn(),
  markSignedIn: vi.fn(),
  createInitialAdmin: vi.fn(),
  recentAuditEvents: vi.fn(),
  registerAndCreateWorkspace: vi.fn(),
  saveWorkspaceBook: vi.fn(),
  updateAppUserProfile: vi.fn(),
  updateWorkspaceProfile: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

const { appRouter } = await import("./routers");

function authenticatedContext(): TrpcContext {
  return {
    user: { id: "user-1", email: "owner@example.com", name: "陈晨", avatarPreset: "classic", role: "member", createdAt: new Date(), updatedAt: new Date(), lastSignedInAt: null },
    req: {} as never,
    res: {} as never,
  };
}

describe("profile update routes", () => {
  it("saves the personal name and private avatar asset under the authenticated user", async () => {
    dbMocks.updateAppUserProfile.mockResolvedValue({ id: "user-1", name: "陈晨", avatarAssetId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.profile.updateMe({ name: "陈晨", avatarAssetId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0" })).resolves.toMatchObject({ id: "user-1" });
    expect(dbMocks.updateAppUserProfile).toHaveBeenCalledWith("user-1", { name: "陈晨", avatarAssetId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0" });
  });

  it("saves a supported brand avatar preset for the authenticated user", async () => {
    dbMocks.updateAppUserProfile.mockResolvedValue({ id: "user-1", name: "陈晨", avatarPreset: "ecommerce" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.profile.updateMe({ name: "陈晨", avatarPreset: "ecommerce" })).resolves.toMatchObject({ avatarPreset: "ecommerce" });
    expect(dbMocks.updateAppUserProfile).toHaveBeenCalledWith("user-1", { name: "陈晨", avatarPreset: "ecommerce" });
  });

  it("saves shop identity fields and the private logo asset with the authenticated workspace owner", async () => {
    dbMocks.updateWorkspaceProfile.mockResolvedValue({ workspace: { id: "b312ce34-410b-49e9-a81f-0971fd9846d8" }, role: "owner" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.workspace.updateProfile({ workspaceId: "b312ce34-410b-49e9-a81f-0971fd9846d8", name: "晨光零售", industryId: "retail", contactName: "陈晨", logoAssetId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0", logoPreset: "retail" })).resolves.toMatchObject({ role: "owner" });
    expect(dbMocks.updateWorkspaceProfile).toHaveBeenCalledWith({ workspaceId: "b312ce34-410b-49e9-a81f-0971fd9846d8", userId: "user-1", name: "晨光零售", industryId: "retail", contactName: "陈晨", logoAssetId: "d356f4c6-5832-4ce4-b3ea-9ff59a722dd0", logoPreset: "retail" });
  });

  it("allows an initially empty shop contact so bootstrap-era workspaces can save their first profile edit", async () => {
    dbMocks.updateWorkspaceProfile.mockResolvedValue({ workspace: { id: "b312ce34-410b-49e9-a81f-0971fd9846d8" }, role: "owner" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.workspace.updateProfile({ workspaceId: "b312ce34-410b-49e9-a81f-0971fd9846d8", name: "晨光零售", industryId: "retail", contactName: "" })).resolves.toMatchObject({ role: "owner" });
    expect(dbMocks.updateWorkspaceProfile).toHaveBeenCalledWith({ workspaceId: "b312ce34-410b-49e9-a81f-0971fd9846d8", userId: "user-1", name: "晨光零售", industryId: "retail", contactName: "" });
  });
});
