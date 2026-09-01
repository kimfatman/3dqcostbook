// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

/**
 * batch-03（C12 页面 P1 批量 6 项）回归：
 * 1. 空间刻度令牌（--sdq-space-1~10 精确值）
 * 2. 图标三档令牌（--sdq-icon-nav/btn/list + --sdq-icon-stroke 1.5px）
 * 3. 图标统一实施（Home.tsx lucide 尺寸三档 + strokeWidth 1.5 + 无 emoji；C5 更多菜单结构不破）
 * 4. 按钮四态（hover 亮度 / disabled 半透明+not-allowed / active 缩放）——batch-01 已做主要 :active，本批补全
 * 5. 列表分割线（1px border-subtle、左对齐、最后一项无）
 * 6. 表单标签对齐（左对齐 14px / 必填红星 CSS 渲染 / 输入框 44px / 错误 12px risk）
 *    注：T6 二级表单规格（secondary-form/form-actions）已在此前批次规格化，本批仅统一 label/星号/高度。
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

/** 跳转到指定子页（沿用既有 URL + popstate 导航）。 */
async function openScreen(screenName: string, heading: string) {
  window.history.replaceState({}, "", `/?screen=${screenName}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findByRole("heading", { name: heading });
}

describe("batch-03 令牌契约：空间刻度 / 图标三档", () => {
  it("semantic.css 定义 --sdq-space-1~10 空间刻度令牌（精确值：4/8/12/16/20/24/32/40px）", () => {
    const expected: Record<string, string> = {
      "--sdq-space-1": "4px",
      "--sdq-space-2": "8px",
      "--sdq-space-3": "12px",
      "--sdq-space-4": "16px",
      "--sdq-space-5": "20px",
      "--sdq-space-6": "24px",
      "--sdq-space-8": "32px",
      "--sdq-space-10": "40px",
    };
    for (const [token, value] of Object.entries(expected)) {
      expect(semanticCss).toMatch(new RegExp(`${token}\\s*:\\s*${value}`));
    }
  });

  it("semantic.css 定义图标尺寸三档 + 线宽令牌（--sdq-icon-nav 20 / --sdq-icon-btn 16 / --sdq-icon-list 18 / --sdq-icon-stroke 1.5px）", () => {
    expect(semanticCss).toMatch(/--sdq-icon-nav\s*:\s*20px/);
    expect(semanticCss).toMatch(/--sdq-icon-btn\s*:\s*16px/);
    expect(semanticCss).toMatch(/--sdq-icon-list\s*:\s*18px/);
    expect(semanticCss).toMatch(/--sdq-icon-stroke\s*:\s*1\.5px/);
    // 表单控件高 44px（移动端触控目标）
    expect(semanticCss).toMatch(/--sdq-height-control\s*:\s*44px/);
  });
});

describe("batch-03 CSS 契约：步骤 1/2/4/5/6 全局规则存在", () => {
  it("步骤1 卡片间距：标准卡外边距/内边距 16px（--sdq-space-4），大卡 20px（--sdq-space-5）", () => {
    expect(indexCss).toContain("margin-bottom: var(--sdq-space-4)");
    expect(indexCss).toContain("padding: var(--sdq-space-4)");
    expect(indexCss).toContain("padding: var(--sdq-space-5)");
  });

  it("步骤2 卡片圆角三档收口：radius-lg 16px / radius-md 12px / radius-sm 8px", () => {
    expect(semanticCss).toMatch(/--sdq-radius-lg\s*:\s*16px/);
    expect(semanticCss).toMatch(/--sdq-radius-md\s*:\s*12px/);
    expect(semanticCss).toMatch(/--sdq-radius-sm\s*:\s*8px/);
    expect(indexCss).toContain("border-radius: var(--sdq-radius-lg)");
    expect(indexCss).toContain("border-radius: var(--sdq-radius-md)");
    expect(indexCss).toContain("border-radius: var(--sdq-radius-sm)");
  });

  it("步骤4 按钮四态：hover 亮度+5% / disabled 半透明+not-allowed / active 缩放 .97（batch-01 已做主要 :active，本批补全次要操作）", () => {
    expect(indexCss).toMatch(/filter:\s*brightness\(1\.05\)/);
    expect(indexCss).toMatch(/opacity:\s*\.5/);
    expect(indexCss).toContain("cursor: not-allowed");
    expect(indexCss).toMatch(/transform:\s*scale\(\.97\)/);
  });

  it("步骤5 列表分割线：1px border-subtle、左对齐 16px、最后一项无分割线", () => {
    expect(indexCss).toContain("border-bottom-color: var(--sdq-border-subtle)");
    expect(indexCss).toContain("border-bottom: 0");
    expect(indexCss).toContain("left: 16px");
    expect(indexCss).toContain("background: var(--sdq-border-subtle)");
  });

  it("步骤6 表单标签对齐：左对齐 14px text-primary / 必填红星 CSS 渲染 / 输入框 44px / 错误 12px risk", () => {
    expect(indexCss).toContain("font-size: 14px");
    expect(indexCss).toContain("color: var(--sdq-text-primary)");
    expect(indexCss).toContain("text-align: left");
    expect(indexCss).toContain("min-height: var(--sdq-height-control)");
    expect(indexCss).toContain(".sdq-req::after");
    expect(indexCss).toContain('content: "*"');
    expect(indexCss).toMatch(/color:\s*var\(--sdq-risk\)/);
    expect(indexCss).toMatch(/font-size:\s*12px/);
  });
});

describe("batch-03 图标统一契约：Home.tsx lucide 三档尺寸 + 线宽 1.5 + 无 emoji", () => {
  it("所有图标标签统一 strokeWidth={1.5}（品牌头像/店铺预设回退符为既有品牌标识例外）", () => {
    const offenders = homeTsx
      .split("\n")
      .map((line, index) => ({ line, index: index + 1 }))
      .filter(({ line }) => /<[A-Z][A-Za-z0-9]*\s[^>]*size=\{/.test(line) && !line.includes("strokeWidth={1.5}"))
      .filter(({ line }) => !line.includes("brand-avatar") && !line.includes("store-preset-mark"));
    expect(offenders.map((item) => item.index)).toEqual([]);
  });

  it("图标尺寸仅三档（按钮 16 / 列表 18 / 导航 20），品牌头像回退符（35/22/15）属品牌标识例外", () => {
    const sizes = Array.from(homeTsx.matchAll(/size=\{(\d+)\}/g)).map((match) => Number(match[1]));
    const unexpected = Array.from(new Set(sizes)).filter((size) => ![15, 16, 18, 20, 22, 35].includes(size));
    expect(unexpected).toEqual([]);
    expect(sizes.filter((size) => size === 16).length).toBeGreaterThan(0); // 按钮
    expect(sizes.filter((size) => size === 18).length).toBeGreaterThan(0); // 列表
    expect(sizes.filter((size) => size === 20).length).toBeGreaterThan(0); // 导航/FAB
  });

  it("Home.tsx 无 emoji 图标残留（⚠️✅📊 等应替换为 lucide SVG 图标）", () => {
    const hasEmoji = Array.from(homeTsx).some((char) => {
      const cp = char.codePointAt(0)!;
      return (
        (cp >= 0x1f300 && cp <= 0x1faff) || // 杂项符号与象形文字
        (cp >= 0x2600 && cp <= 0x27bf) || // 杂项符号/装饰符号
        (cp >= 0x2b00 && cp <= 0x2bff) || // 杂项符号和箭头
        cp === 0xfe0f // 变体选择符（emoji 修饰）
      );
    });
    expect(hasEmoji).toBe(false);
  });

  it("C5 更多菜单结构不破：row-more / more-trigger / detail-more-menu 类与 aria 属性保持（上次回退点）", () => {
    // 行内更多触发器保留既有交互语言（data-testid / aria-expanded / aria-controls / aria-label）
    expect(homeTsx).toContain('className="row-more" data-testid={`row-more-${id}`}');
    expect(homeTsx).toContain('className="more-trigger row-more-trigger"');
    expect(homeTsx).toContain('aria-expanded={open} aria-controls={`row-more-${id}`} aria-label="更多操作"');
    expect(homeTsx).toContain('className="detail-more-menu" id={`row-more-${id}`}');
    // 菜单内编辑/删除图标同属按钮档 16px + 线宽 1.5
    expect(homeTsx).toContain("<Pencil size={16} strokeWidth={1.5} />");
    expect(homeTsx).toContain("<Trash2 size={16} strokeWidth={1.5} />");
  });
});

describe("batch-03 DOM 回归：图标线宽落地 + C5 更多菜单可用 + 表单必填星", () => {
  it("工作台首页 lucide 图标以 stroke-width=1.5 渲染（尺寸三档落地）", () => {
    const { container } = renderHome();
    expect(container.querySelectorAll('svg[stroke-width="1.5"]').length).toBeGreaterThan(0);
  });

  it("C5 更多菜单打开/编辑/删除均可用（图标改动未破坏交互结构）", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 商品采购供应商" });
    // 行内更多触发器（按钮档 16px 图标）
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    expect(within(row).getByRole("button", { name: "编辑供应商" })).toBeTruthy();
    expect(within(row).getByRole("button", { name: "删除供应商" })).toBeTruthy();
    expect(row.querySelectorAll('svg[stroke-width="1.5"]').length).toBeGreaterThan(0);

    // 从菜单进入编辑仍走同一表单
    await user.click(within(row).getByRole("button", { name: "编辑供应商" }));
    expect(screen.getByRole("heading", { name: "编辑供应商" })).toBeTruthy();
    expect((screen.getByLabelText("供应商名称") as HTMLInputElement).value).toBe("商品采购供应商");
  });

  it("记一笔表单：必填星由 .sdq-req 元素 CSS 渲染，label 文本不含字面 '*'（getByLabelText 名称不受影响）", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await screen.findByRole("heading", { name: "记录一笔收支" });

    const reqMarks = document.querySelectorAll(".record-form .sdq-req");
    expect(reqMarks.length).toBeGreaterThanOrEqual(2);
    // 星号由 ::after 渲染，DOM 文本保持纯净
    const typeLabel = screen.getByText("交易类型");
    expect(typeLabel.textContent).toBe("交易类型");
    expect(typeLabel.textContent).not.toContain("*");
    // 金额输入框仍可定位（名称未受星号影响）
    expect((screen.getByPlaceholderText("0.00") as HTMLInputElement).name).toBe("amount");
  });
});
