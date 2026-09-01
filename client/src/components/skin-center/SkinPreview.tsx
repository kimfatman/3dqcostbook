import { useMemo } from "react";
import { getSkinMeta } from "../../skins";

interface SkinPreviewProps {
  /** 当前预览的皮肤 id（官方 5 种或自定义皮肤的 baseSkin） */
  skinId: string;
  /** 自定义皮肤的令牌覆盖（可选） */
  customOverrides?: Record<string, string>;
  /** 是否为自定义皮肤预览 */
  isCustom?: boolean;
}

const tabs = ["工作台", "订单", "商品", "洞察", "我的"];

/** 迷你工作台实时预览：以 scale(0.85) 缩小，实时应用 skin-{id} class */
export function SkinPreview({ skinId, customOverrides, isCustom }: SkinPreviewProps) {
  const meta = getSkinMeta(skinId);
  const overrideStyle = useMemo(() => {
    const style: Record<string, string> = {};
    if (customOverrides) {
      for (const [key, value] of Object.entries(customOverrides)) style[key] = value;
    }
    return style;
  }, [customOverrides]);

  return (
    <div
      className={`mobile-shell skin-preview-shell skin-${skinId}`}
      style={{ ...overrideStyle, transform: "scale(0.85)", transformOrigin: "top center" }}
      aria-label="皮肤实时预览"
      data-testid="skin-preview"
    >
      <div className="skin-preview-inner">
        <div className="skin-preview-topbar">
          <span className="skin-preview-title">经营概览</span>
          <span className="skin-preview-tag">{isCustom ? `${meta.name}·自定义` : meta.name}</span>
        </div>
        <div className="skin-preview-card skin-preview-overview">
          <span className="skin-preview-eyebrow">本月营收</span>
          <strong className="skin-preview-amount">¥86,240</strong>
          <em className="skin-preview-trend">↑ 12.4% 较上月</em>
        </div>
        <div className="skin-preview-metrics">
          <span className="skin-preview-metric"><b>12</b><em>今日订单</em></span>
          <span className="skin-preview-metric"><b>38.2%</b><em>毛利率</em></span>
          <span className="skin-preview-metric"><b>¥8,420</b><em>净营收</em></span>
        </div>
        <div className="skin-preview-card skin-preview-product">
          <span className="skin-preview-product-thumb" />
          <span className="skin-preview-product-info"><b>水煮鱼</b><em>单位成本 ¥26.1 · 毛利 61%</em></span>
          <span className="skin-preview-product-badge">健康</span>
        </div>
        <div className="skin-preview-tabbar">
          {tabs.map((t, i) => <span key={t} className={i === 0 ? "skin-preview-tab active" : "skin-preview-tab"}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}
