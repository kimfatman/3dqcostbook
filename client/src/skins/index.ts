/**
 * 算得清 SDQ 皮肤注册表（skins/index.ts）
 * 定义 5 种官方皮肤的元数据，供皮肤中心/皮肤切换统一消费。
 * 皮肤 CSS 文件在 client/src/skins/ 下，本文件仅承载元数据，不承载样式。
 */

export type SkinId = "soft" | "deep" | "aurora" | "midnight" | "forest";
export type SkinMode = "light" | "dark";

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
  /** 4 个关键预览色：bg-canvas / bg-surface / action-primary / profit */
  previewColors: [string, string, string, string];
}

export const SKIN_REGISTRY: SkinMeta[] = [
  {
    id: "soft",
    name: "清蓝",
    description: "默认浅色皮肤，清爽的 Digital Blue 蓝色调",
    mode: "light",
    author: "SDQ",
    previewColors: ["#f7f9fc", "#ffffff", "#087ff5", "#20a779"],
  },
  {
    id: "deep",
    name: "深蓝",
    description: "深蓝色调暗色皮肤，护眼专注",
    mode: "dark",
    author: "SDQ",
    previewColors: ["#0b1220", "#151f31", "#439ef9", "#20a779"],
  },
  {
    id: "aurora",
    name: "极光",
    description: "玻璃拟态浅色皮肤，轻盈通透",
    mode: "light",
    author: "SDQ",
    previewColors: ["#f7f9fc", "rgba(255,255,255,0.94)", "#087ff5", "#5acbfa"],
  },
  {
    id: "midnight",
    name: "午夜黑",
    description: "纯黑深色皮肤，极致省电",
    mode: "dark",
    author: "SDQ",
    previewColors: ["#000000", "#111111", "#439ef9", "#20a779"],
  },
  {
    id: "forest",
    name: "森林绿",
    description: "森林绿品牌浅色皮肤，自然清新",
    mode: "light",
    author: "SDQ",
    previewColors: ["#f5f7fa", "#ffffff", "#20a779", "#20a779"],
  },
];

/** 按 id 快速查找皮肤元数据；找不到时回退 soft */
export function getSkinMeta(id: string): SkinMeta {
  return SKIN_REGISTRY.find((s) => s.id === id) ?? SKIN_REGISTRY[0];
}
