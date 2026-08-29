import { describe, expect, it } from "vitest";
import { buildCosMediaKey, verifyCosMediaStorage } from "./cos-media";

const cosConfigured = Boolean(process.env.COS_BUCKET && process.env.COS_REGION);

describe("腾讯云 COS 媒体存储", () => {
  it("将所有媒体对象限制在应用前缀和工作区路径下，且拒绝路径穿越片段", () => {
    expect(buildCosMediaKey({ workspaceId: "workspace-1", subjectId: "card-1", kind: "cost_card_image", assetId: "asset-1", extension: "webp" })).toMatch(/^costbook-media\/v1\/workspaces\/workspace-1\/cost_card_image\/card-1\/asset-1\.webp$/);
    expect(() => buildCosMediaKey({ workspaceId: "../other", subjectId: "user-1", kind: "user_avatar", assetId: "asset-1", extension: "jpg" })).not.toThrow();
    expect(buildCosMediaKey({ workspaceId: "../other", subjectId: "user-1", kind: "user_avatar", assetId: "asset-1", extension: "jpg" })).not.toContain("..");
  });

  it.skipIf(!cosConfigured)("在显式启用时可使用最小权限凭证访问指定私有 Bucket", async () => {
    if (process.env.COS_LIVE_CHECK !== "1") return;
    const result = await verifyCosMediaStorage();
    expect(result).toEqual({ bucket: process.env.COS_BUCKET, region: process.env.COS_REGION });
  }, 20_000);
});
