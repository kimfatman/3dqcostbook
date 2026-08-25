export const MEDIA_KINDS = ["user_avatar", "workspace_logo", "cost_card_image", "record_voucher"] as const;
export type MediaKind = typeof MEDIA_KINDS[number];

const mimeToExtension: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function mediaExtension(mimeType: string) {
  return mimeToExtension[mimeType.toLowerCase()] || null;
}

export function validateMediaUpload(input: { kind: string; mimeType: string; sizeBytes: number; subjectId: string; workspaceId: string; userId: string; role: "owner" | "editor" | "viewer" }) {
  if (!input.workspaceId.trim() || !input.subjectId.trim()) return { ok: false as const, reason: "缺少工作区或资源主体" };
  if (!MEDIA_KINDS.includes(input.kind as MediaKind)) return { ok: false as const, reason: "不支持的图片类型" };
  if (!mediaExtension(input.mimeType)) return { ok: false as const, reason: "仅支持 JPG、PNG 或 WebP 图片" };
  const maxBytes = input.kind === "cost_card_image" || input.kind === "record_voucher" ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maxBytes) return { ok: false as const, reason: `图片大小不能超过 ${maxBytes / 1024 / 1024} MB` };
  if (input.role === "viewer") return { ok: false as const, reason: "查看者不能上传图片" };
  if (input.kind === "user_avatar" && input.subjectId !== input.userId) return { ok: false as const, reason: "只能更新自己的头像" };
  if (input.kind === "workspace_logo" && (input.role !== "owner" || input.subjectId !== input.workspaceId)) return { ok: false as const, reason: "仅店铺 owner 可更新店铺 Logo" };
  return { ok: true as const, extension: mediaExtension(input.mimeType)! };
}
