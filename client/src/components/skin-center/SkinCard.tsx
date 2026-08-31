import { Check, Copy, Download, Pencil, Trash2 } from "lucide-react";
import type { SkinMeta } from "../../skins";

interface SkinCardProps {
  skin: SkinMeta;
  /** 是否为当前生效皮肤 */
  isActive: boolean;
  /** 点击卡片 → 先预览（不立即应用） */
  onPreview: () => void;
  /** 点击"应用" → 真正切换 */
  onApply: () => void;
  /** 是否为自定义皮肤 */
  isCustom?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

/** 皮肤卡片：4 色预览条 + 名称 + 描述 + 模式标签 + 应用/自定义操作 */
export function SkinCard({ skin, isActive, onPreview, onApply, isCustom, onEdit, onDuplicate, onExport, onDelete }: SkinCardProps) {
  const colors = skin.previewColors;
  return (
    <div className={`skin-card${isActive ? " active" : ""}`} data-skin-id={skin.id}>
      <button type="button" className="skin-card-preview" onClick={onPreview} aria-label={`预览${skin.name}`}>
        <span className="skin-card-swatches">
          <i style={{ background: colors.primary }} aria-hidden="true" />
          <i style={{ background: colors.background }} aria-hidden="true" />
          <i style={{ background: colors.surface }} aria-hidden="true" />
          <i style={{ background: colors.text }} aria-hidden="true" />
        </span>
      </button>
      <div className="skin-card-body">
        <div className="skin-card-title-row">
          <b>{skin.name}</b>
          <span className={`skin-card-mode ${skin.mode === "dark" ? "dark" : ""}`}>{skin.mode === "dark" ? "深色" : "浅色"}</span>
        </div>
        <p className="skin-card-desc">{skin.description}</p>
        <div className="skin-card-actions">
          {isActive ? (
            <button type="button" className="skin-card-apply applied" disabled aria-disabled="true"><Check size={15} />已应用</button>
          ) : (
            <button type="button" className="skin-card-apply" onClick={onApply}>应用</button>
          )}
          {isCustom && (
            <span className="skin-card-custom-ops">
              <button type="button" onClick={onEdit} aria-label={`编辑${skin.name}`} title="编辑"><Pencil size={14} /></button>
              <button type="button" onClick={onDuplicate} aria-label={`复制${skin.name}`} title="复制"><Copy size={14} /></button>
              <button type="button" onClick={onExport} aria-label={`导出${skin.name}`} title="导出"><Download size={14} /></button>
              <button type="button" onClick={onDelete} aria-label={`删除${skin.name}`} title="删除"><Trash2 size={14} /></button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
