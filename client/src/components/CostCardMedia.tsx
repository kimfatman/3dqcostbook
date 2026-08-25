import { ImagePlus, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function costCardMediaUrl(assetId?: string) {
  return assetId ? `/api/media/${assetId}` : null;
}

export function CostCardThumbnail({ assetId, alt }: { assetId?: string; alt: string }) {
  const url = costCardMediaUrl(assetId);
  return url ? <img className="cost-card-thumb" src={url} alt={alt} /> : <span className="cost-card-thumb placeholder"><ImagePlus size={17} /></span>;
}

export function CostCardMediaEditor({ assetId, alt, entityLabel, onUpload }: { assetId?: string; alt: string; entityLabel: string; onUpload: (file: File) => Promise<void> | void }) {
  const url = costCardMediaUrl(assetId);
  const [uploading, setUploading] = useState(false);
  return <label className={`cost-card-media-editor ${url ? "has-image" : ""} ${uploading ? "uploading" : ""}`} aria-busy={uploading}>
    <span className="cost-card-media-preview">{url ? <img src={url} alt={alt} /> : <ImagePlus size={19} />}</span>
    <span className="cost-card-media-copy"><b>{uploading ? "正在上传图片…" : url ? `更换${entityLabel}图片` : `添加${entityLabel}图片`}</b><em>JPEG、PNG 或 WebP · 最大 5MB</em></span>
    {uploading ? <LoaderCircle className="cost-card-media-loader" size={18} /> : null}
    <input type="file" disabled={uploading} accept="image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (!file) return; setUploading(true); try { await onUpload(file); } finally { setUploading(false); } }} />
  </label>;
}
