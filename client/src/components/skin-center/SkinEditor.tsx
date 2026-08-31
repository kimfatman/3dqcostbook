import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SKIN_REGISTRY, type CustomSkin, type SkinId } from "../../skins";
import { ColorPicker } from "./ColorPicker";
import { SkinPreview } from "./SkinPreview";

interface SkinEditorProps {
  open: boolean;
  /** 编辑已有皮肤时传入；新建时传 null */
  initial?: CustomSkin | null;
  onClose: () => void;
  onSave: (input: { name: string; description: string; baseSkin: SkinId; overrides: Record<string, string> }) => void;
}

const DEFAULT_VALUES = {
  primary: "#0880f7",
  background: "#f5f7fa",
  surface: "#ffffff",
  textPrimary: "#212830",
  textSecondary: "#576575",
  border: "#ebf0f4",
  radius: 12,
  spacing: 16,
};

function readOverride(overrides: Record<string, string>, key: string, fallback: string) {
  const v = overrides[key];
  return typeof v === "string" && v ? v : fallback;
}

function readOverridePx(overrides: Record<string, string>, key: string, fallback: number) {
  const v = overrides[key];
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

/** 自定义皮肤编辑器：基础信息 + 关键颜色 + 圆角/间距滑块 + 实时预览 */
export function SkinEditor({ open, initial, onClose, onSave }: SkinEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseSkin, setBaseSkin] = useState<SkinId>("soft");
  const [primary, setPrimary] = useState(DEFAULT_VALUES.primary);
  const [background, setBackground] = useState(DEFAULT_VALUES.background);
  const [surface, setSurface] = useState(DEFAULT_VALUES.surface);
  const [textPrimary, setTextPrimary] = useState(DEFAULT_VALUES.textPrimary);
  const [textSecondary, setTextSecondary] = useState(DEFAULT_VALUES.textSecondary);
  const [border, setBorder] = useState(DEFAULT_VALUES.border);
  const [radius, setRadius] = useState(DEFAULT_VALUES.radius);
  const [spacing, setSpacing] = useState(DEFAULT_VALUES.spacing);

  useEffect(() => {
    if (!open) return;
    const o = initial?.overrides ?? {};
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setBaseSkin(initial?.baseSkin ?? "soft");
    setPrimary(readOverride(o, "--sdq-action-primary", DEFAULT_VALUES.primary));
    setBackground(readOverride(o, "--sdq-bg-canvas", DEFAULT_VALUES.background));
    setSurface(readOverride(o, "--sdq-bg-surface", DEFAULT_VALUES.surface));
    setTextPrimary(readOverride(o, "--sdq-text-primary", DEFAULT_VALUES.textPrimary));
    setTextSecondary(readOverride(o, "--sdq-text-secondary", DEFAULT_VALUES.textSecondary));
    setBorder(readOverride(o, "--sdq-border-subtle", DEFAULT_VALUES.border));
    setRadius(readOverridePx(o, "--sdq-radius-md", DEFAULT_VALUES.radius));
    setSpacing(readOverridePx(o, "--sdq-space-card", DEFAULT_VALUES.spacing));
  }, [open, initial]);

  if (!open) return null;

  const overrides: Record<string, string> = {
    "--sdq-action-primary": primary,
    "--sdq-bg-brand": primary,
    "--sdq-bg-canvas": background,
    "--sdq-bg-surface": surface,
    "--sdq-text-primary": textPrimary,
    "--sdq-text-secondary": textSecondary,
    "--sdq-border-subtle": border,
    "--sdq-radius-md": `${radius}px`,
    "--sdq-radius-sm": `${Math.max(radius - 4, 4)}px`,
    "--sdq-space-card": `${spacing}px`,
    "--sdq-space-section": `${spacing + 8}px`,
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, description: description.trim(), baseSkin, overrides });
    onClose();
  };

  return (
    <div className="skin-editor-layer" role="dialog" aria-modal="true" aria-labelledby="skin-editor-title">
      <div className="skin-editor-scrim" aria-hidden="true" onClick={onClose} />
      <div className="skin-editor-panel">
        <div className="skin-editor-head">
          <h2 id="skin-editor-title">{initial ? "编辑自定义皮肤" : "创建自定义皮肤"}</h2>
          <button type="button" className="skin-editor-close" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        <div className="skin-editor-preview"><SkinPreview skinId={baseSkin} customOverrides={overrides} isCustom /></div>
        <div className="skin-editor-form">
          <label className="skin-editor-field"><span>名称</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：我的暖色" /></label>
          <label className="skin-editor-field"><span>描述</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话描述（可选）" /></label>
          <label className="skin-editor-field"><span>基于</span>
            <select value={baseSkin} onChange={(e) => setBaseSkin(e.target.value as SkinId)}>
              {SKIN_REGISTRY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="skin-editor-colors">
            <ColorPicker label="品牌主色" value={primary} onChange={setPrimary} />
            <ColorPicker label="背景色" value={background} onChange={setBackground} />
            <ColorPicker label="卡片背景" value={surface} onChange={setSurface} />
            <ColorPicker label="主文字" value={textPrimary} onChange={setTextPrimary} />
            <ColorPicker label="次文字" value={textSecondary} onChange={setTextSecondary} />
            <ColorPicker label="边框色" value={border} onChange={setBorder} />
          </div>
          <label className="skin-editor-slider"><span>卡片圆角 <em>{radius}px</em></span>
            <input type="range" min={4} max={24} step={1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </label>
          <label className="skin-editor-slider"><span>基础间距 <em>{spacing}px</em></span>
            <input type="range" min={4} max={24} step={1} value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} />
          </label>
        </div>
        <div className="skin-editor-actions">
          <button type="button" className="skin-editor-cancel" onClick={onClose}>取消</button>
          <button type="button" className="skin-editor-save" onClick={handleSave} disabled={!name.trim()}>保存</button>
        </div>
      </div>
    </div>
  );
}
