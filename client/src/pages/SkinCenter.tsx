import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Sparkles, Upload } from "lucide-react";
import {
  ACTIVE_CUSTOM_SKIN_KEY,
  CUSTOM_SKINS_KEY,
  loadActiveCustomSkin,
  loadCustomSkins,
  saveActiveCustomSkin,
  saveCustomSkins,
  SKIN_REGISTRY,
  type CustomSkin,
  type SkinId,
} from "../skins";
import type { VisualSkin } from "../lib/cost-book";
import "../components/skin-center/skin-center.css";
import { SkinCard } from "../components/skin-center/SkinCard";
import { SkinPreview } from "../components/skin-center/SkinPreview";
import { SkinEditor } from "../components/skin-center/SkinEditor";

const FOLLOW_KEY = "sdq-skin-follow-system";
const REDUCE_MOTION_KEY = "sdq-reduce-motion";
const LARGE_FONT_KEY = "sdq-large-font";

interface SkinCenterProps {
  visualSkin: VisualSkin;
  activeCustomSkin: CustomSkin | null;
  onApplyOfficial: (skin: VisualSkin) => void;
  onApplyCustom: (skin: CustomSkin) => void;
  onBack: () => void;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** 皮肤中心页面：预览区 + 官方皮肤 + 自定义皮肤 + 高级设置 + 导入导出 */
export function SkinCenter({ visualSkin, activeCustomSkin, onApplyOfficial, onApplyCustom, onBack }: SkinCenterProps) {
  const [customSkins, setCustomSkins] = useState<CustomSkin[]>(() => loadCustomSkins());
  const [selectedSkinId, setSelectedSkinId] = useState<SkinId>(activeCustomSkin?.baseSkin ?? visualSkin);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(activeCustomSkin?.id ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSkin, setEditingSkin] = useState<CustomSkin | null | undefined>(undefined);
  const [followSystem, setFollowSystem] = useState(() => window.localStorage.getItem(FOLLOW_KEY) === "1");
  const [reduceMotion, setReduceMotion] = useState(() => window.localStorage.getItem(REDUCE_MOTION_KEY) === "1");
  const [largeFont, setLargeFont] = useState(() => window.localStorage.getItem(LARGE_FONT_KEY) === "1");
  const importRef = useRef<HTMLInputElement>(null);

  const selectedCustom = useMemo(
    () => (selectedCustomId ? customSkins.find((s) => s.id === selectedCustomId) ?? null : null),
    [selectedCustomId, customSkins]
  );

  // 跟随系统：监听系统明暗偏好，自动在 soft/deep 间切换
  useEffect(() => {
    if (!followSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      setSelectedSkinId(mq.matches ? "deep" : "soft");
      setSelectedCustomId(null);
      onApplyOfficial(mq.matches ? "deep" : "soft");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followSystem]);

  // 降低动效 / 大字体模式
  useEffect(() => {
    document.documentElement.classList.toggle("sdq-reduce-motion", reduceMotion);
    window.localStorage.setItem(REDUCE_MOTION_KEY, reduceMotion ? "1" : "0");
  }, [reduceMotion]);
  useEffect(() => {
    document.documentElement.classList.toggle("sdq-large-font", largeFont);
    window.localStorage.setItem(LARGE_FONT_KEY, largeFont ? "1" : "0");
  }, [largeFont]);

  const applyOfficial = (id: VisualSkin) => {
    setFollowSystem(false);
    window.localStorage.setItem(FOLLOW_KEY, "0");
    onApplyOfficial(id);
  };
  const applyCustom = (skin: CustomSkin) => {
    setFollowSystem(false);
    window.localStorage.setItem(FOLLOW_KEY, "0");
    onApplyCustom(skin);
  };

  const persistCustom = (next: CustomSkin[]) => {
    setCustomSkins(next);
    saveCustomSkins(next);
  };

  const handleSaveEditor = (input: { name: string; description: string; baseSkin: SkinId; overrides: Record<string, string> }) => {
    if (editingSkin) {
      const updated = customSkins.map((s) => (s.id === editingSkin.id ? { ...s, ...input } : s));
      persistCustom(updated);
      // 若编辑的是当前生效自定义皮肤，同步生效
      if (activeCustomSkin?.id === editingSkin.id) {
        const next = updated.find((s) => s.id === editingSkin.id);
        if (next) onApplyCustom(next);
      }
    } else {
      const created: CustomSkin = { id: uid("custom"), name: input.name, description: input.description, baseSkin: input.baseSkin, overrides: input.overrides, createdAt: new Date().toISOString() };
      persistCustom([...customSkins, created]);
    }
  };

  const duplicateSkin = (skin: CustomSkin) => {
    const copy: CustomSkin = { ...skin, id: uid("custom"), name: `${skin.name} 副本`, createdAt: new Date().toISOString() };
    persistCustom([...customSkins, copy]);
  };

  const exportSkin = (skin: CustomSkin) => {
    downloadJson(`sdq-skin-${skin.name}.json`, skin);
  };

  const deleteSkin = (skin: CustomSkin) => {
    const next = customSkins.filter((s) => s.id !== skin.id);
    persistCustom(next);
    if (activeCustomSkin?.id === skin.id) {
      saveActiveCustomSkin(null);
      onApplyOfficial(skin.baseSkin);
    }
    if (selectedCustomId === skin.id) {
      setSelectedCustomId(null);
      setSelectedSkinId(visualSkin);
    }
  };

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = Array.isArray(parsed) ? parsed : [parsed];
        const valid = incoming
          .filter((s: Partial<CustomSkin>) => s && typeof s.name === "string" && typeof s.baseSkin === "string" && s.overrides && typeof s.overrides === "object")
          .map((s: Partial<CustomSkin>) => ({ id: s.id || uid("custom"), name: s.name as string, description: s.description || "", baseSkin: s.baseSkin as SkinId, overrides: s.overrides as Record<string, string>, createdAt: s.createdAt || new Date().toISOString() }));
        if (valid.length === 0) return;
        persistCustom([...customSkins, ...valid]);
      } catch {
        /* 非法 JSON 忽略 */
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="skin-center-page">
      <section className="sub-intro compact">
        <button type="button" className="skin-center-back" onClick={onBack} aria-label="返回"><ArrowLeft size={18} /></button>
        <span>我的 · 外观</span>
        <h1>皮肤中心</h1>
        <p>统一管理应用外观，先预览再应用；自定义皮肤仅保存在本机。</p>
      </section>

      <section className="skin-center-preview-zone" aria-label="皮肤实时预览">
        <div className="skin-center-preview-wrap">
          <SkinPreview skinId={selectedSkinId} customOverrides={selectedCustom?.overrides} isCustom={Boolean(selectedCustom)} />
        </div>
        <p className="skin-center-preview-tip">正在预览：{selectedCustom?.name ?? SKIN_REGISTRY.find((s) => s.id === selectedSkinId)?.name}</p>
      </section>

      <section className="skin-center-section">
        <h2>官方皮肤</h2>
        <div className="skin-center-grid">
          {SKIN_REGISTRY.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              isActive={!activeCustomSkin && visualSkin === skin.id}
              onPreview={() => { setSelectedSkinId(skin.id); setSelectedCustomId(null); }}
              onApply={() => applyOfficial(skin.id)}
            />
          ))}
        </div>
      </section>

      <section className="skin-center-section">
        <h2>我的自定义皮肤</h2>
        {customSkins.length === 0 ? (
          <p className="skin-center-empty">还没有自定义皮肤；基于官方皮肤创建属于你的配色。</p>
        ) : (
          <div className="skin-center-grid">
            {customSkins.map((skin) => (
              <SkinCard
                key={skin.id}
                skin={{ id: skin.baseSkin, name: skin.name, description: skin.description, mode: SKIN_REGISTRY.find((s) => s.id === skin.baseSkin)?.mode ?? "light", author: "自定义", previewColors: { primary: skin.overrides["--sdq-action-primary"] ?? "#0880f7", background: skin.overrides["--sdq-bg-canvas"] ?? "#f5f7fa", surface: skin.overrides["--sdq-bg-surface"] ?? "#ffffff", text: skin.overrides["--sdq-text-primary"] ?? "#212830" } }}
                isActive={activeCustomSkin?.id === skin.id}
                isCustom
                onPreview={() => { setSelectedCustomId(skin.id); setSelectedSkinId(skin.baseSkin); }}
                onApply={() => applyCustom(skin)}
                onEdit={() => { setEditingSkin(skin); setEditorOpen(true); }}
                onDuplicate={() => duplicateSkin(skin)}
                onExport={() => exportSkin(skin)}
                onDelete={() => deleteSkin(skin)}
              />
            ))}
          </div>
        )}
        <div className="skin-center-create-row">
          <button type="button" className="skin-center-create" onClick={() => { setEditingSkin(undefined); setEditorOpen(true); }}><Plus size={16} />创建自定义皮肤</button>
          <button type="button" className="skin-center-import" onClick={() => importRef.current?.click()}><Upload size={16} />导入皮肤</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => { handleImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </section>

      <section className="skin-center-section">
        <h2>高级设置</h2>
        <div className="skin-center-settings">
          <label className="skin-center-setting"><span><Sparkles size={16} /><b>跟随系统</b><em>浅色/深色随系统自动切换</em></span><input type="checkbox" checked={followSystem} onChange={(e) => setFollowSystem(e.target.checked)} /></label>
          <label className="skin-center-setting"><span><Sparkles size={16} /><b>降低动效</b><em>减少过渡动画，提升低配设备性能</em></span><input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} /></label>
          <label className="skin-center-setting"><span><Sparkles size={16} /><b>大字体模式</b><em>界面字号整体放大 2px</em></span><input type="checkbox" checked={largeFont} onChange={(e) => setLargeFont(e.target.checked)} /></label>
        </div>
      </section>

      <SkinEditor open={editorOpen} initial={editingSkin} onClose={() => setEditorOpen(false)} onSave={handleSaveEditor} />
    </div>
  );
}

/** 供 Home 读取/写入生效自定义皮肤的辅助（复用注册表持久化 key） */
export const skinCenterStorage = { ACTIVE_CUSTOM_SKIN_KEY, CUSTOM_SKINS_KEY, loadActiveCustomSkin, saveActiveCustomSkin };
