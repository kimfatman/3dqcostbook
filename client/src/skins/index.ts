/**
 * 算得清 SDQ 皮肤注册表（skins/index.ts）
 * 定义 5 种官方皮肤的元数据，供皮肤中心/皮肤切换统一消费。
 * 皮肤 CSS 文件在 client/src/skins/ 下，本文件仅承载元数据，不承载样式。
 */

export type SkinId = "soft" | "deep" | "aurora" | "midnight" | "forest";
export type SkinMode = "light" | "dark";

export interface SkinPreviewColors {
  /** 品牌主色 */
  primary: string;
  /** 页面背景 */
  background: string;
  /** 卡片背景 */
  surface: string;
  /** 主文字 */
  text: string;
}

export interface SkinMeta {
  id: SkinId;
  /** 显示名称（中文） */
  name: string;
  /** 一句话描述 */
  description: string;
  /** 明暗模式：light 浅色 / dark 深色 */
  mode: SkinMode;
  /** 作者 */
  author: string;
  /** 预览用 4 个关键色 */
  previewColors: SkinPreviewColors;
}

export const SKIN_REGISTRY: SkinMeta[] = [
  {
    id: "soft",
    name: "清蓝",
    description: "默认浅色皮肤，清爽的 Digital Blue 蓝色调，适合日常经营",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#0880f7", background: "#f5f7fa", surface: "#ffffff", text: "#212830" },
  },
  {
    id: "deep",
    name: "深蓝",
    description: "深蓝色调暗色皮肤，护眼专注，适合夜间使用",
    mode: "dark",
    author: "官方",
    previewColors: { primary: "#439ef9", background: "#14191f", surface: "#151f31", text: "#f5f7fa" },
  },
  {
    id: "aurora",
    name: "极光",
    description: "玻璃拟态浅色皮肤，半透明卡片，视觉轻盈",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#0880f7", background: "#f7f9fc", surface: "rgba(255,255,255,0.94)", text: "#212830" },
  },
  {
    id: "midnight",
    name: "午夜黑",
    description: "纯黑深色皮肤，OLED 屏省电，对比度最高",
    mode: "dark",
    author: "官方",
    previewColors: { primary: "#439ef9", background: "#000000", surface: "#111111", text: "#f5f7fa" },
  },
  {
    id: "forest",
    name: "森林绿",
    description: "森林绿品牌浅色皮肤，自然清新，适合生鲜/农业行业",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#20a779", background: "#f5f7fa", surface: "#ffffff", text: "#212830" },
  },
];

/** 按 id 快速查找皮肤元数据；找不到时回退 soft */
export function getSkinMeta(id: string): SkinMeta {
  return SKIN_REGISTRY.find((s) => s.id === id) ?? SKIN_REGISTRY[0];
}

/** 自定义皮肤结构（localStorage key: sdq-custom-skins） */
export interface CustomSkin {
  id: string;
  name: string;
  description: string;
  /** 基于哪个官方皮肤 */
  baseSkin: SkinId;
  /** 覆盖的语义令牌，如 { "--sdq-action-primary": "#ff0000" } */
  overrides: Record<string, string>;
  createdAt: string;
}

export const CUSTOM_SKINS_KEY = "sdq-custom-skins";
export const ACTIVE_CUSTOM_SKIN_KEY = "sdq-active-custom-skin";

/** 从 localStorage 读取自定义皮肤列表；失败或空时返回 [] */
export function loadCustomSkins(): CustomSkin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_SKINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CustomSkin[]) : [];
  } catch {
    return [];
  }
}

/** 写入自定义皮肤列表到 localStorage */
export function saveCustomSkins(skins: CustomSkin[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_SKINS_KEY, JSON.stringify(skins));
}

/** 读取当前生效的自定义皮肤（未应用时 null） */
export function loadActiveCustomSkin(): CustomSkin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CUSTOM_SKIN_KEY);
    return raw ? (JSON.parse(raw) as CustomSkin) : null;
  } catch {
    return null;
  }
}

/** 写入当前生效的自定义皮肤（null 表示不生效） */
export function saveActiveCustomSkin(skin: CustomSkin | null): void {
  if (typeof window === "undefined") return;
  if (skin) window.localStorage.setItem(ACTIVE_CUSTOM_SKIN_KEY, JSON.stringify(skin));
  else window.localStorage.removeItem(ACTIVE_CUSTOM_SKIN_KEY);
}
