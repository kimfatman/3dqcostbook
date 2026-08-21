import { describe, expect, it } from "vitest";
import { validateMediaUpload } from "./media-validation";

const base = { workspaceId: "workspace-1", userId: "user-1", subjectId: "user-1", role: "owner" as const, mimeType: "image/webp", sizeBytes: 1024 };

describe("媒体上传校验", () => {
  it("拒绝缺少工作区或资源主体的上传请求", () => {
    expect(validateMediaUpload({ ...base, kind: "cost_card_image", workspaceId: "", subjectId: "card-1" })).toMatchObject({ ok: false, reason: "缺少工作区或资源主体" });
  });

  it("只允许受支持图片、尺寸限制和正确的资源角色", () => {
    expect(validateMediaUpload({ ...base, kind: "user_avatar" })).toEqual({ ok: true, extension: "webp" });
    expect(validateMediaUpload({ ...base, kind: "workspace_logo", subjectId: "workspace-1" })).toEqual({ ok: true, extension: "webp" });
    expect(validateMediaUpload({ ...base, kind: "cost_card_image", role: "viewer", subjectId: "card-1" })).toMatchObject({ ok: false });
    expect(validateMediaUpload({ ...base, kind: "user_avatar", mimeType: "image/gif" })).toMatchObject({ ok: false });
    expect(validateMediaUpload({ ...base, kind: "cost_card_image", subjectId: "card-1", sizeBytes: 5 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
  });
});
