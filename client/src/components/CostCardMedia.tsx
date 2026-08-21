import { ImagePlus } from "lucide-react";

export function costCardMediaUrl(assetId?: string) {
  return assetId ? `/api/media/${assetId}` : null;
}

export function CostCardThumbnail({ assetId, alt }: { assetId?: string; alt: string }) {
  const url = costCardMediaUrl(assetId);
  return url ? <img className="cost-card-thumb" src={url} alt={alt} /> : <span className="cost-card-thumb placeholder"><ImagePlus size={17} /></span>;
}

export function CostCardMediaEditor({ assetId, alt, onUpload }: { assetId?: string; alt: string; onUpload: (file: File) => void }) {
  const url = costCardMediaUrl(assetId);
  return <label className="cost-card-media-editor">{url ? <img src={url} alt={alt} /> : <span><ImagePlus size={20} />添加商品图片</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label>;
}
