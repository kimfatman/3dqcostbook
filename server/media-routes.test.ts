import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocalUserFromRequest: vi.fn(),
  getWorkspaceAccess: vi.fn(),
  createMediaAsset: vi.fn(),
  putCosMedia: vi.fn(),
  buildCosMediaKey: vi.fn(),
}));

vi.mock("./_core/context", () => ({ getLocalUserFromRequest: mocks.getLocalUserFromRequest }));
vi.mock("./db", () => ({
  getWorkspaceAccess: mocks.getWorkspaceAccess,
  createMediaAsset: mocks.createMediaAsset,
  getMediaAssetForUser: vi.fn(),
}));
vi.mock("./cos-media", () => ({
  putCosMedia: mocks.putCosMedia,
  buildCosMediaKey: mocks.buildCosMediaKey,
  getCosMediaUrl: vi.fn(),
}));

const { registerMediaRoutes } = await import("./media-routes");

async function requestUpload(headers: Record<string, string> = {}, body = Buffer.from("test-image")) {
  const app = express();
  registerMediaRoutes(app);
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server address unavailable");
  try {
    return await fetch(`http://127.0.0.1:${address.port}/api/media/upload`, {
      method: "POST",
      headers: { "content-type": "image/png", ...headers },
      body,
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.putCosMedia.mockResolvedValue(undefined);
  mocks.createMediaAsset.mockResolvedValue(undefined);
  mocks.buildCosMediaKey.mockReturnValue("costbook-media/v1/workspaces/workspace-1/cost_card_image/card-1/asset.png");
});

afterEach(() => vi.restoreAllMocks());

describe("protected media upload HTTP route", () => {
  it("rejects unauthenticated uploads before reading workspace or media data", async () => {
    mocks.getLocalUserFromRequest.mockResolvedValue(null);

    const response = await requestUpload();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "请先登录" });
    expect(mocks.getWorkspaceAccess).not.toHaveBeenCalled();
    expect(mocks.putCosMedia).not.toHaveBeenCalled();
  });

  it("rejects authenticated uploads that omit the workspace or resource subject", async () => {
    mocks.getLocalUserFromRequest.mockResolvedValue({ id: "user-1" });

    const response = await requestUpload({ "x-media-kind": "cost_card_image" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "缺少工作区或资源主体" });
    expect(mocks.getWorkspaceAccess).not.toHaveBeenCalled();
    expect(mocks.putCosMedia).not.toHaveBeenCalled();
  });

  it("stores an allowed owner image in the private workspace path and returns only the protected asset route", async () => {
    mocks.getLocalUserFromRequest.mockResolvedValue({ id: "user-1" });
    mocks.getWorkspaceAccess.mockResolvedValue({ role: "owner" });

    const response = await requestUpload({ "x-media-kind": "cost_card_image", "x-workspace-id": "workspace-1", "x-subject-id": "card-1" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: expect.any(String), url: expect.stringMatching(/^\/api\/media\//) });
    expect(mocks.buildCosMediaKey).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", subjectId: "card-1", kind: "cost_card_image", extension: "png" }));
    expect(mocks.putCosMedia).toHaveBeenCalledWith(expect.objectContaining({ storageKey: expect.stringContaining("workspaces/workspace-1"), mimeType: "image/png" }));
    expect(mocks.createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", ownerUserId: "user-1", kind: "cost_card_image", storageKey: expect.stringContaining("workspaces/workspace-1") }));
  });

  it("stores a record voucher under the current workspace and returns only its protected read route", async () => {
    mocks.getLocalUserFromRequest.mockResolvedValue({ id: "user-1" });
    mocks.getWorkspaceAccess.mockResolvedValue({ role: "editor" });
    mocks.buildCosMediaKey.mockReturnValue("costbook-media/v1/workspaces/workspace-1/record_voucher/record-1/asset.png");

    const response = await requestUpload({ "x-media-kind": "record_voucher", "x-workspace-id": "workspace-1", "x-subject-id": "record-1" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ url: expect.stringMatching(/^\/api\/media\//) });
    expect(mocks.buildCosMediaKey).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", subjectId: "record-1", kind: "record_voucher", extension: "png" }));
    expect(mocks.createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", ownerUserId: "user-1", kind: "record_voucher", storageKey: expect.stringContaining("workspaces/workspace-1/record_voucher/record-1") }));
  });

  it.each([
    { kind: "user_avatar", subjectId: "user-1" },
    { kind: "workspace_logo", subjectId: "workspace-1" },
  ] as const)("stores an allowed $kind upload under the owning workspace and returns only a protected route", async ({ kind, subjectId }) => {
    mocks.getLocalUserFromRequest.mockResolvedValue({ id: "user-1" });
    mocks.getWorkspaceAccess.mockResolvedValue({ role: "owner" });
    mocks.buildCosMediaKey.mockReturnValue(`costbook-media/v1/workspaces/workspace-1/${kind}/${subjectId}/asset.png`);

    const response = await requestUpload({ "x-media-kind": kind, "x-workspace-id": "workspace-1", "x-subject-id": subjectId });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ url: expect.stringMatching(/^\/api\/media\//) });
    expect(mocks.buildCosMediaKey).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", subjectId, kind, extension: "png" }));
    expect(mocks.createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-1", ownerUserId: "user-1", kind, storageKey: expect.stringContaining(`workspaces/workspace-1/${kind}/${subjectId}`) }));
  });
});
