import express, { type Express, type Request } from "express";
import { randomUUID } from "node:crypto";
import { createMediaAsset, getMediaAssetForUser, getWorkspaceAccess } from "./db";
import { getLocalUserFromRequest } from "./_core/context";
import { buildCosMediaKey, getCosMediaUrl, putCosMedia } from "./cos-media";
import { type MediaKind, validateMediaUpload } from "./media-validation";

function header(req: Request, name: string) {
  const value = req.headers[name];
  return typeof value === "string" ? value.trim() : "";
}

export function registerMediaRoutes(app: Express) {
  app.post("/api/media/upload", express.raw({ type: () => true, limit: "5mb" }), async (req, res) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "请先登录" });
      const workspaceId = header(req, "x-workspace-id");
      const subjectId = header(req, "x-subject-id");
      const kind = header(req, "x-media-kind") as MediaKind;
      const access = workspaceId ? await getWorkspaceAccess(workspaceId, user.id) : undefined;
      if (!access) return res.status(403).json({ error: "工作区不存在或无访问权限" });
      const validation = validateMediaUpload({ kind, mimeType: header(req, "content-type").split(";")[0] || "", sizeBytes: Buffer.isBuffer(req.body) ? req.body.length : 0, subjectId, workspaceId, userId: user.id, role: access.role });
      if (!validation.ok) return res.status(400).json({ error: validation.reason });
      const assetId = randomUUID();
      const storageKey = buildCosMediaKey({ workspaceId, subjectId, kind, assetId, extension: validation.extension });
      await putCosMedia({ storageKey, body: req.body, mimeType: header(req, "content-type").split(";")[0] });
      await createMediaAsset({ id: assetId, workspaceId, ownerUserId: user.id, kind, storageKey, mimeType: header(req, "content-type").split(";")[0], sizeBytes: req.body.length });
      return res.status(201).json({ id: assetId, url: `/api/media/${assetId}` });
    } catch (error) {
      console.error("[media.upload]", error);
      return res.status(500).json({ error: "图片上传失败，请稍后重试" });
    }
  });

  app.get("/api/media/:assetId", async (req, res) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).end();
      const asset = await getMediaAssetForUser(req.params.assetId, user.id);
      if (!asset) return res.status(404).end();
      return res.redirect(302, await getCosMediaUrl(asset.storageKey));
    } catch (error) {
      console.error("[media.read]", error);
      return res.status(500).end();
    }
  });
}
