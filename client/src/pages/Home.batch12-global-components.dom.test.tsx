// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

/**
 * batch-12（全局组件打磨 P0）回归：
 * 1. 按钮：五变体（primary/secondary/ghost/danger/link）× 三尺寸（32/40/48）× 五状态（default/hover/active/disabled/loading），
 *    图标按钮 40×40 + :active scale .92，loading 旋转图标 + “处理中” + 禁点
 * 2. 卡片：default/elevated/brand 三变体，内边距 16/20px、圆角 12/16px、elevated 阴影、可点击 :active scale .98
 * 3. 输入框：44px、focus 品牌蓝描边+4px 光晕、error risk 描边+12px 提示、disabled；前缀/后缀图标 16px
 * 4. 标签/徽章/状态点：success/warning/danger/info/neutral 语义色变体
 * 5. 模态框/Toast/空态/加载态：入场/退场动画、Toast 三态、骨架屏三型、分割线
 * 6. 令牌纪律：batch-12 段落只引用 --sdq-* 语义令牌（无新增令牌、无硬编码色值）
 * 7. jsdom 回归：成功/错误 Toast 变体落地、Home.tsx 调用点与既有结构不破
 */

const trpcMocks = vi.hoisted(() => ({
  authData: undefined as any,
  workspaceData: undefined as any,
  authLoading: false,
}));

vi.mock("@/lib/trpc", () => {
  const queryResult = (data: unknown = undefined) => ({ data, error: null, isLoading: false, refetch: vi.fn() });
  const mutationResult = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    trpc: {
      auth: {
        me: {
          useQuery: () => ({
            data: trpcMocks.authData,
            error: null,
            isLoading: trpcMocks.authLoading,
            refetch: vi.fn(),
          }),
        },
        logout: { useMutation: mutationResult },
      },
      workspace: {
        list: { useQuery: () => queryResult(trpcMocks.workspaceData) },
        book: { useQuery: queryResult },
        saveBook: { useMutation: mutationResult },
        updateProfile: { useMutation: mutationResult },
      },
      profile: { updateMe: { useMutation: mutationResult } },
      useUtils: () => ({
        auth: { me: { invalidate: vi.fn(), refetch: vi.fn() } },
        workspace: { list: { invalidate: vi.fn(), refetch: vi.fn() } },
      }),
    },
  };
});

const indexCss = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const semanticCss = readFileSync(resolve(__dirname, "../tokens/semantic.css"), "utf8");
const homeTsx = readFileSync(resolve(__dirname, "./Home.tsx"), "utf8");

/** 仅截取本批次追加段落（marker 起），保证断言不依赖早期覆盖规则。 */
const batch12Section = indexCss.slice(indexCss.indexOf("batch-12 全局组件打磨"));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  trpcMocks.authData = undefined;
  trpcMocks.workspaceData = undefined;
  trpcMocks.authLoading = false;
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

function renderHome() {
  return render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
}

describe("batch-12 按钮：五变体 × 三尺寸 × 五状态", () => {
  it("基础类 .sdq-btn 定义（inline-flex / gap / border-radius sm / transition）", () => {
    expect(batch12Section).toContain(".sdq-btn {");
    expect(batch12Section).toContain("display: inline-flex;");
    expect(batch12Section).toContain("border-radius: var(--sdq-radius-sm);");
    expect(batch12Section).toContain("cursor: pointer;");
  });

  it("五种变体完整（primary/secondary/ghost/danger/link）且只引用 --sdq-* 语义令牌", () => {
    for (const variant of [".sdq-btn-primary", ".sdq-btn-secondary", ".sdq-btn-ghost", ".sdq-btn-danger", ".sdq-btn-link"]) {
      expect(batch12Section).toContain(variant + " {");
    }
    expect(batch12Section).toContain("background: var(--sdq-action-primary);");
    expect(batch12Section).toContain("background: var(--sdq-risk);");
    expect(batch12Section).toContain("color: var(--sdq-text-link);");
  });

  it("三种尺寸完整：sm 32 / md 40 / lg 48", () => {
    expect(batch12Section).toMatch(/\.sdq-btn-sm \{ min-height: 32px;/);
    expect(batch12Section).toMatch(/\.sdq-btn-md \{ min-height: 40px;/);
    expect(batch12Section).toMatch(/\.sdq-btn-lg \{ min-height: 48px;/);
  });

  it("五种状态完整：default/hover/active/disabled/loading", () => {
    // hover 亮度 +5%
    expect(batch12Section).toMatch(/\.sdq-btn:hover:not\(:disabled\):not\(\.sdq-btn-loading\) \{ filter: brightness\(1\.05\); \}/);
    // active 缩放 .97
    expect(batch12Section).toContain("transform: scale(.97);");
    // disabled + loading：半透明 + not-allowed + 禁点
    expect(batch12Section).toContain(".sdq-btn:disabled, .sdq-btn-loading");
    expect(batch12Section).toContain("cursor: not-allowed;");
    expect(batch12Section).toContain("pointer-events: none;");
    // loading 旋转图标 + 动画
    expect(batch12Section).toContain(".sdq-btn .sdq-btn-spin");
    expect(batch12Section).toContain("@keyframes sdq-spin");
  });

  it("图标按钮：40×40 最小触控目标 + :active scale .92", () => {
    expect(batch12Section).toMatch(/\.sdq-btn-icon \{ width: 40px; min-width: 40px; height: 40px;/);
    expect(batch12Section).toContain("transform: scale(.92);");
  });
});

describe("batch-12 卡片 / 输入框 / 标签徽章", () => {
  it("卡片三变体：default/elevated/brand，内边距 16/20px、圆角 12/16px、elevated 阴影", () => {
    expect(batch12Section).toContain(".sdq-card {");
    expect(batch12Section).toContain(".sdq-card-elevated {");
    expect(batch12Section).toContain(".sdq-card-brand {");
    expect(batch12Section).toContain("padding: var(--sdq-space-4);");
    expect(batch12Section).toContain("padding: var(--sdq-space-5);");
    expect(batch12Section).toContain("border-radius: var(--sdq-radius-md);");
    expect(batch12Section).toContain("border-radius: var(--sdq-radius-lg);");
    expect(batch12Section).toContain("box-shadow: 0 2px 8px color-mix(in srgb, var(--sdq-blue-950) 6%, transparent);");
  });

  it("可点击卡片 :active scale(.98) + 标题 h2 20px -0.01em / 内容 14px", () => {
    expect(batch12Section).toContain(".sdq-card-clickable:active {");
    expect(batch12Section).toContain("transform: scale(.98);");
    expect(batch12Section).toMatch(/\.sdq-card-title \{ margin: 0; color: var\(--sdq-text-primary\); font-size: 20px; letter-spacing: -\.01em; \}/);
    expect(batch12Section).toContain("font-size: 14px; line-height: 1.55;");
  });

  it("输入框：44px 高、focus 品牌蓝+4px 光晕、error risk 描边+12px 提示、disabled、图标 16px", () => {
    expect(batch12Section).toContain(".sdq-input {");
    expect(batch12Section).toContain("min-height: var(--sdq-height-control);");
    expect(batch12Section).toContain(".sdq-input:focus {");
    expect(batch12Section).toContain("border-color: var(--sdq-action-primary);");
    expect(batch12Section).toContain("box-shadow: 0 0 0 4px color-mix(in srgb, var(--sdq-action-primary) 15%, transparent);");
    expect(batch12Section).toContain(".sdq-input-error { border-color: var(--sdq-risk); }");
    expect(batch12Section).toContain(".sdq-field-error-message");
    expect(batch12Section).toMatch(/\.sdq-field-error-message \{ margin-top: 2px; color: var\(--sdq-risk\); font-size: 12px;/);
    expect(batch12Section).toContain(".sdq-input:disabled");
    expect(batch12Section).toContain(".sdq-input-wrap > svg");
    expect(batch12Section).toContain("width: 16px; height: 16px; color: var(--sdq-text-secondary);");
  });

  it("标签/徽章/状态点：success/warning/danger/info/neutral 语义变体", () => {
    for (const variant of [".sdq-tag-primary", ".sdq-tag-success", ".sdq-tag-warning", ".sdq-tag-danger", ".sdq-tag-info"]) {
      expect(batch12Section).toContain(variant + " {");
    }
    for (const variant of [".sdq-badge-primary", ".sdq-badge-success", ".sdq-badge-warning", ".sdq-badge-info"]) {
      expect(batch12Section).toContain(variant + " {");
    }
    for (const variant of [".sdq-dot-success", ".sdq-dot-warning", ".sdq-dot-danger", ".sdq-dot-info"]) {
      expect(batch12Section).toContain(variant + " {");
    }
    expect(batch12Section).toMatch(/\.sdq-badge \{ display: inline-grid; min-width: 16px; height: 16px;/);
    expect(batch12Section).toMatch(/\.sdq-dot \{ display: inline-block; width: 8px; height: 8px;/);
  });
});

describe("batch-12 模态框 / Toast / 空态 / 加载态", () => {
  it("模态框：入场 slide-up + spring 400ms / 退场 slide-down 200ms / 遮罩 fade-in 200ms / 70vh 滚动 / 40×40 关闭钮", () => {
    expect(batch12Section).toContain("@keyframes sdq-modal-in");
    expect(batch12Section).toContain("@keyframes sdq-modal-out");
    expect(batch12Section).toContain("@keyframes sdq-fade-in");
    expect(batch12Section).toContain("animation: sdq-modal-in 400ms cubic-bezier(.23, 1, .32, 1);");
    expect(batch12Section).toContain("max-height: 70vh;");
    expect(batch12Section).toContain("overflow-y: auto;");
    expect(batch12Section).toContain("width: 40px; height: 40px;");
    // 既有确认层（voucher-guard / consent）接入同一动画语言
    expect(batch12Section).toContain(".voucher-guard-card { animation: sdq-modal-in 400ms cubic-bezier(.23, 1, .32, 1);");
    expect(batch12Section).toContain(".voucher-guard-scrim { animation: sdq-fade-in 200ms ease-out; }");
    expect(batch12Section).toContain(".selfhost-consent-scrim { animation: sdq-fade-in 200ms ease-out; }");
  });

  it("Toast：成功/警告/错误三态 + 入场动画 + 3s 自动消失（Home.tsx timeout 3000）", () => {
    expect(batch12Section).toContain(".app-toast-success");
    expect(batch12Section).toContain(".app-toast-warning");
    expect(batch12Section).toContain(".app-toast-error");
    expect(batch12Section).toContain("@keyframes sdq-toast-in");
    expect(homeTsx).toContain("window.setTimeout(() => setToast(null), 3000)");
  });

  it("空态：图标 + 标题 + 描述 + 操作按钮，居中", () => {
    expect(batch12Section).toContain(".sdq-empty {");
    expect(batch12Section).toContain(".sdq-empty-icon");
    expect(batch12Section).toContain(".sdq-empty-title");
    expect(batch12Section).toContain(".sdq-empty-copy");
    expect(batch12Section).toContain(".sdq-empty-actions");
    expect(batch12Section).toContain("justify-items: center;");
  });

  it("加载态：骨架屏 pulse（列表/卡片/图表 3 型）+ 旋转指示 + 分割线", () => {
    expect(batch12Section).toContain("@keyframes sdq-pulse");
    expect(batch12Section).toContain(".sdq-skeleton-list");
    expect(batch12Section).toContain(".sdq-skeleton-card");
    expect(batch12Section).toContain(".sdq-skeleton-chart");
    expect(batch12Section).toContain(".sdq-spinner");
    expect(batch12Section).toContain(".sdq-divider");
    expect(batch12Section).toContain("background: var(--sdq-border-subtle);");
  });
});

describe("batch-12 令牌纪律：只引用 --sdq-*，不新增令牌/色值", () => {
  it("batch-12 段落无硬编码十六进制色值", () => {
    const hex = /#[0-9a-fA-F]{3,8}/g;
    expect(batch12Section.match(hex) ?? []).toEqual([]);
  });

  it("batch-12 段落不定义新的 --sdq-* 令牌（只消费已有语义令牌，五皮肤自动适配）", () => {
    const definitions = batch12Section.match(/--sdq-[a-z0-9-]+\s*:/g) ?? [];
    expect(definitions).toEqual([]);
  });

  it("semantic.css 提供按钮/输入框所需语义令牌（action 三态 / text-link / height-control）", () => {
    expect(semanticCss).toMatch(/--sdq-action-primary-hover\s*:/);
    expect(semanticCss).toMatch(/--sdq-action-primary-active\s*:/);
    expect(semanticCss).toMatch(/--sdq-text-link\s*:/);
    expect(semanticCss).toMatch(/--sdq-height-control\s*:\s*44px/);
  });
});

describe("batch-12 DOM 回归：Toast 三态落地 + 调用点不破", () => {
  it("保存一笔流水后出现成功 Toast：app-toast-success + 图标 + 消息，role=status 保持", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await screen.findByRole("heading", { name: "记录一笔收支" });
    await user.click(screen.getByRole("button", { name: /更多信息/ }));

    const amountInput = screen.getByPlaceholderText("0.00");
    await user.clear(amountInput);
    await user.type(amountInput, "28.50");
    const merchantInput = screen.getByPlaceholderText("例如：平台服务商");
    await user.clear(merchantInput);
    await user.type(merchantInput, "batch12 回归商户");
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    const toast = screen.getByRole("status");
    expect(toast.className).toContain("app-toast-success");
    expect(toast.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("已新增 ¥28.50 记录")).toBeTruthy();
  });

  it("金额缺失提交出现错误 Toast：app-toast-error + 图标", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await screen.findByRole("heading", { name: "记录一笔收支" });

    await user.click(screen.getByRole("button", { name: "保存记录" }));

    const toast = screen.getByRole("status");
    expect(toast.className).toContain("app-toast-error");
    expect(toast.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("请填写正确的金额")).toBeTruthy();
  });

  it("Toast 图标使用按钮档 16px + strokeWidth 1.5（不破坏 batch-03 图标契约）", () => {
    // Home.tsx 内 Toast 图标均带 size=16 + strokeWidth=1.5
    expect(homeTsx).toContain('<CircleCheck size={16} strokeWidth={1.5}');
    expect(homeTsx).toContain('<CircleX size={16} strokeWidth={1.5}');
    expect(homeTsx).toContain('<TriangleAlert size={16} strokeWidth={1.5}');
    // 无新尺寸档位
    const sizes = Array.from(homeTsx.matchAll(/size=\{(\d+)\}/g)).map((match) => Number(match[1]));
    const unexpected = Array.from(new Set(sizes)).filter((size) => ![15, 16, 18, 20, 22, 35].includes(size));
    expect(unexpected).toEqual([]);
  });

  it("记一笔保存按钮 loading 态：上传中显示旋转图标 + “处理中”，禁点（sdq-btn-spin 落地）", () => {
    expect(homeTsx).toContain('className="fixed-primary form-save" disabled={isUploadingVoucher}');
    expect(homeTsx).toContain('<span className="sdq-btn-spin" aria-hidden="true" />');
    expect(homeTsx).toContain('{isUploadingVoucher ? "处理中" : editing ? "保存修改" : "保存记录"}');
    // CSS 侧旋转动画与禁点规则存在
    expect(batch12Section).toContain(".sdq-btn .sdq-btn-spin");
    expect(batch12Section).toContain("pointer-events: none;");
  });

  it("模态框确认层结构保持（T4 voucher-guard 不破）且 CSS 已接入入场动画", () => {
    expect(homeTsx).toContain('className="voucher-guard-layer" role="alertdialog"');
    expect(homeTsx).toContain('className="voucher-guard-scrim"');
    expect(homeTsx).toContain('className="voucher-guard-card"');
    expect(batch12Section).toContain(".voucher-guard-card { animation: sdq-modal-in 400ms");
  });
});
