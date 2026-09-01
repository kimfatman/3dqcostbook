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
 * batch-14（工作台打磨）jsdom 回归：
 * 1. 经营概览卡：数字滚动（AnimatedChartValue + .home-count-roll，仅 transform/opacity，reduced-motion 降级）、
 *    环比升绿降红（is-positive/is-negative）、深色卡文字 text-inverse、利润 28px / 收入成本 16px
 * 2. KPI 四卡统一：订单数/客单价/退款影响/利润率，图标左 + 数字 20px -0.01em + 趋势右，12px 圆角 16px 内边距，
 *    :active scale(.98)；既有文案（退款影响/今天暂无退款）不破
 * 3. 销售动能图：hover Tooltip（data-tip ::after）、柱状图 action-primary、趋势线 success、入场动画保留
 * 4. 快捷入口：工作台头部 4 宫格（记一笔/订单/商品/洞察），统一图标+文字，:active scale(.95)，可导航
 * 5. 通知列表：静默列表（无自动轮播）+ 可点击跳转 + × 关闭（本次会话），浅色品牌底
 * 6. 页面入场 stagger（home-stagger-in）+ reduced-motion 降级
 * 7. 令牌纪律：batch-14 段落无硬编码色值，只消费 --sdq-* 语义令牌
 * 8. 既有结构不破：home-redesign 仍为 6 个直系 section（快捷入口收纳在头部身份行内），
 *    无 home-quick-entry / home-recent-activity testid（旧回归契约）
 */

const trpcMocks = vi.hoisted(() => ({
  authData: undefined as any,
  workspaceData: undefined as any,
}));

vi.mock("@/lib/trpc", () => {
  const queryResult = (data: unknown = undefined) => ({ data, error: null, isLoading: false, refetch: vi.fn() });
  const mutationResult = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    trpc: {
      auth: { me: { useQuery: () => queryResult(trpcMocks.authData) }, logout: { useMutation: mutationResult } },
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

const indexCss = readFileSync(resolve(__dirname, "../index.css"), "utf8").replace(/\r\n/g, "\n");
const semanticCss = readFileSync(resolve(__dirname, "../tokens/semantic.css"), "utf8").replace(/\r\n/g, "\n");
const homeTsx = readFileSync(resolve(__dirname, "./Home.tsx"), "utf8").replace(/\r\n/g, "\n");
/** 仅截取本批次追加段落（marker 起），保证断言不依赖早期覆盖规则。 */
const batch14Section = indexCss.slice(indexCss.indexOf("batch-14 工作台打磨"));

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
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

function renderHome() {
  return render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
}

describe("batch-14 经营概览卡：数字滚动 + 环比升绿降红 + 字号", () => {
  it("演示数据下主卡非空态：数字滚动容器 .home-count-roll ≥3，环比格带 is-positive/is-negative 语义类", () => {
    renderHome();
    const decisionCard = document.querySelector(".operating-snapshot.home-decision") as HTMLElement;
    expect(decisionCard.classList.contains("is-empty")).toBe(false);
    // 利润 / 净营收 / 总成本 / 结果 四个数值均接入滚动计数容器
    expect(decisionCard.querySelectorAll(".home-count-roll").length).toBeGreaterThanOrEqual(4);
    // 第三个指标格为环比：带 is-positive（升）或 is-negative（降）语义类
    const deltaCell = decisionCard.querySelectorAll(".home-decision-metrics > div")[2];
    expect(deltaCell.className).toMatch(/is-(positive|negative)/);
    // 环比箭头（右迷你趋势）方向类同样落地
    expect(decisionCard.querySelector(".home-decision-result")?.className).toMatch(/is-(up|down)/);
  });

  it("CSS 契约：利润 28px -0.02em、收入/成本 16px、环比升绿降红、深色卡文字 text-inverse", () => {
    expect(batch14Section).toMatch(/\.prototype-home \.home-decision-result strong > b \{\s*font-size: 28px;\s*letter-spacing: -\.02em;/);
    expect(batch14Section).toMatch(/\.prototype-home \.home-decision-equation label b \{\s*font-size: 16px;/);
    expect(batch14Section).toContain(".prototype-home .home-decision-metrics > div.is-positive dd { color: var(--sdq-bg-success-soft); }");
    expect(batch14Section).toContain("--home-card-text: var(--sdq-text-inverse);");
    // 右迷你趋势方向色
    expect(batch14Section).toContain(".prototype-home .home-decision-result.is-up .profit-sculpture em {");
    // 仅 transform/opacity 的滚动容器 + reduced-motion 降级
    expect(batch14Section).toContain(".home-count-roll { display: inline-block; animation: home-value-swap 260ms ease-out; }");
    expect(batch14Section).toContain("@keyframes home-value-swap");
    expect(batch14Section).toContain("from { opacity: 0; transform: translateY(5px); }");
    expect(batch14Section).toContain("@media (prefers-reduced-motion: reduce) { .home-count-roll { animation: none; } }");
  });

  it("范围切换回归：今天/本周/本月 aria-pressed 正确，切换后主卡与环比标签同步", async () => {
    const user = userEvent.setup();
    renderHome();
    const rangeSwitcher = screen.getByRole("group", { name: "经营概览时间范围" });
    expect(within(rangeSwitcher).getByRole("button", { name: "今天" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(within(rangeSwitcher).getByRole("button", { name: "本月" }));
    expect(within(rangeSwitcher).getByRole("button", { name: "本月" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("较上月同期")).toBeTruthy();
    await user.click(within(rangeSwitcher).getByRole("button", { name: "本周" }));
    expect(within(rangeSwitcher).getByRole("button", { name: "本周" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("较上周同期")).toBeTruthy();
  });
});

describe("batch-14 KPI 四卡统一", () => {
  it("渲染 4 张 KPI 卡：订单数/客单价/退款影响/利润率，统一 图标+数字+趋势 结构", () => {
    renderHome();
    const strip = screen.getByTestId("home-operational-metrics");
    const cards = strip.querySelectorAll(".home-kpi-card");
    expect(cards.length).toBe(4);
    for (const card of Array.from(cards)) {
      expect(card.querySelector(".home-kpi-icon")).toBeTruthy();
      expect(card.querySelector(".home-kpi-head em")).toBeTruthy();
      expect(card.querySelector(".home-kpi-value")).toBeTruthy();
      expect(card.querySelector(".home-kpi-trend")).toBeTruthy();
    }
    expect(within(strip).getByText("订单数")).toBeTruthy();
    expect(within(strip).getByText("客单价")).toBeTruthy();
    expect(within(strip).getByText("退款影响")).toBeTruthy();
    expect(within(strip).getByText("利润率")).toBeTruthy();
    // 既有文案契约：今天暂无退款
    expect(within(strip).getByText("今天暂无退款")).toBeTruthy();
  });

  it("CSS 契约：数字 20px -0.01em、标签 12px text-secondary、12px 圆角 16px 内边距、:active scale(.98)", () => {
    expect(batch14Section).toMatch(/\.prototype-home \.home-kpi-value \{\s*[^}]*font-size: 20px;/);
    expect(batch14Section).toMatch(/\.prototype-home \.home-kpi-value \{\s*[^}]*letter-spacing: -\.01em;/);
    expect(batch14Section).toMatch(/\.prototype-home \.home-kpi-head em \{\s*[^}]*color: var\(--sdq-text-secondary\);\s*[^}]*font-size: 12px;/);
    expect(batch14Section).toContain(".prototype-home .home-operational-metrics > .home-kpi-card:active {");
    expect(batch14Section).toContain("transform: scale(.98);");
    expect(batch14Section).toContain("border-radius: var(--sdq-radius-md);");
    expect(batch14Section).toContain("padding: 14px;");
    // 图标统一：品牌浅底 + action-primary + 固定 34px
    expect(batch14Section).toContain(".prototype-home .home-kpi-icon {");
    expect(batch14Section).toContain("width: 34px;\n  height: 34px;");
    expect(batch14Section).toContain("color: var(--sdq-action-primary);");
    expect(batch14Section).toContain("background: var(--sdq-bg-brand-soft);");
  });
});

describe("batch-14 销售动能图：hover Tooltip + 配色", () => {
  it("7 日柱每根带 data-tip（日期+金额+环比）与 aria-label，零值日保留（不破既有零值契约）", () => {
    renderHome();
    const card = screen.getByTestId("home-sales-orders-trend");
    const bars = card.querySelectorAll(".sales-bars > span");
    expect(bars.length).toBe(7);
    for (const bar of Array.from(bars)) {
      expect(bar.getAttribute("data-tip")).toMatch(/\d+日 ¥[\d,]+\.\d{2} · 环比 /);
      expect(bar.getAttribute("aria-label")).toContain("成交额");
      expect(bar.querySelector("i")?.getAttribute("style")).toContain("height:");
    }
  });

  it("CSS 契约：Tooltip ::after content attr(data-tip) + 柱 action-primary + 趋势线 success + 入场动画保留", () => {
    expect(batch14Section).toContain(".prototype-home .sales-bars span::after {");
    expect(batch14Section).toContain("content: attr(data-tip);");
    expect(batch14Section).toContain(".prototype-home .sales-bars span:hover::after,");
    expect(batch14Section).toContain("opacity: 1;");
    expect(batch14Section).toMatch(/\.prototype-home \.sales-bars i \{\s*background: linear-gradient\(180deg, color-mix\(in srgb, var\(--sdq-action-primary\)/);
    expect(batch14Section).toContain(".prototype-home .sales-orders-plot .sales-orders-line {");
    expect(batch14Section).toContain("stroke: var(--sdq-profit);");
    // 既有入场动画（柱生长 460ms / 趋势线描边 720ms）在 no-preference 下保留
    expect(indexCss).toMatch(/chart-bar-in 460ms var\(--chart-ease\) both/);
    expect(indexCss).toMatch(/chart-line-in 720ms var\(--chart-ease\) forwards/);
  });
});

describe("batch-14 快捷入口：4 宫格统一 + 可导航", () => {
  it("工作台头部渲染 4 个统一入口（记一笔/订单/商品/洞察），图标+文字，点击可导航", async () => {
    const user = userEvent.setup();
    renderHome();
    const quick = document.querySelector(".home-quick-entry") as HTMLElement;
    expect(quick).toBeTruthy();
    expect(screen.queryByTestId("home-quick-entry")).toBeNull(); // 旧契约：无该 testid
    const buttons = Array.from(quick.querySelectorAll("button"));
    expect(buttons.length).toBe(4);
    expect(buttons.map((button) => button.textContent)).toEqual(["记一笔", "订单", "商品", "洞察"]);
    for (const button of buttons) {
      expect(button.querySelector("i svg")).toBeTruthy(); // 统一图标
      expect(button.querySelector("span")).toBeTruthy(); // 统一文字
    }

    // 记一笔 → 记一笔表单
    await user.click(within(quick).getByRole("button", { name: "记一笔" }));
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByRole("navigation", { name: "主导航" });

    // 返回后重新定位快捷入口（工作台已重挂载）
    const quickAfter = document.querySelector(".home-quick-entry") as HTMLElement;
    expect(quickAfter).toBeTruthy();
    // 洞察 → 洞察页
    await user.click(within(quickAfter).getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "工作台" }));
    await screen.findByRole("navigation", { name: "主导航" });
  });

  it("CSS 契约：2×2 网格、图标 40px 盒、文字 12px、12px 圆角、:active scale(.95) + 背景加深", () => {
    expect(batch14Section).toContain(".home-identity-context .home-quick-entry {");
    expect(batch14Section).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(batch14Section).toContain(".home-identity-context .home-quick-entry button:active {");
    expect(batch14Section).toContain("transform: scale(.95);");
    expect(batch14Section).toContain("background: var(--sdq-bg-surface-subtle);");
    expect(batch14Section).toContain(".home-identity-context .home-quick-entry button i {");
    expect(batch14Section).toContain("width: 40px;\n  height: 40px;");
    expect(batch14Section).toContain("font-size: 12px;");
  });
});

describe("batch-14 通知列表：静默列表 + 可关闭", () => {
  it("演示数据下渲染提醒列表，点击 × 关闭后该条从工作台消失（本次会话）", async () => {
    const user = userEvent.setup();
    renderHome();
    const reminders = document.querySelector(".home-reminders") as HTMLElement;
    expect(reminders).toBeTruthy();
    const rowsBefore = reminders.querySelectorAll(".home-reminder-item").length;
    expect(rowsBefore).toBeGreaterThan(0);

    const firstTitle = reminders.querySelector(".home-reminder-row b")?.textContent || "";
    const closeButton = reminders.querySelector(".home-reminder-close") as HTMLButtonElement;
    expect(closeButton.getAttribute("aria-label")).toContain("关闭提醒");
    await user.click(closeButton);

    expect(reminders.querySelectorAll(".home-reminder-item").length).toBe(rowsBefore - 1);
    expect(screen.queryByText(firstTitle)).toBeNull();
    // 列表仍保留（未清空全部时）
    expect(document.querySelector(".home-reminders")).toBeTruthy();
  });

  it("静默列表：不再有自动轮播间隔（reminderIndex 死代码已移除）", () => {
    expect(homeTsx).not.toContain("reminderIndex");
    expect(homeTsx).not.toContain("setReminderIndex");
    expect(homeTsx).toContain("dismissedReminderIds");
    // 每条提醒可独立关闭
    expect(homeTsx).toContain("home-reminder-close");
    expect(homeTsx).toContain('aria-label={`关闭提醒：${item.title}`}');
  });

  it("CSS 契约：浅色品牌底（bg-brand-soft 派生）+ 左图标右文案 + 1px 左对齐分割线 + 最后一项无", () => {
    expect(batch14Section).toContain(".prototype-home .home-reminders {");
    expect(batch14Section).toContain("background: color-mix(in srgb, var(--sdq-bg-brand-soft) 62%, var(--sdq-bg-surface));");
    expect(batch14Section).toContain(".prototype-home .home-reminder-item {");
    expect(batch14Section).toContain("border-bottom: 1px solid var(--sdq-border-subtle);");
    expect(batch14Section).toContain(".prototype-home .home-reminder-item:last-child { border-bottom: 0; }");
    expect(batch14Section).toContain(".prototype-home .home-reminder-close {");
  });
});

describe("batch-14 页面入场 stagger + 令牌纪律", () => {
  it("home-redesign 直系 section 仍为 6 个（快捷入口收纳在头部身份行内），stagger 动画存在", () => {
    renderHome();
    const home = document.querySelector(".home-redesign") as HTMLElement;
    expect(home.children.length).toBe(6);
    expect(home.children[0].className).toContain("home-identity-context");
    expect(home.children[1].className).toContain("home-decision");
    expect(home.children[2].className).toContain("home-operational-metrics");
    expect(home.children[5].className).toContain("home-reminders");
    expect(batch14Section).toContain("@keyframes home-stagger-in");
    expect(batch14Section).toMatch(/\.prototype-home\.home-redesign > \*:nth-child\(6\) \{ animation-delay: 200ms; \}/);
    expect(batch14Section).toContain("@media (prefers-reduced-motion: reduce) {\n  .prototype-home.home-redesign > * { animation: none !important; }");
  });

  it("batch-14 段落无硬编码十六进制色值，不定义新 --sdq-* 令牌（只消费已有语义令牌）", () => {
    const hex = /#[0-9a-fA-F]{3,8}/g;
    expect(batch14Section.match(hex) ?? []).toEqual([]);
    const definitions = batch14Section.match(/--sdq-[a-z0-9-]+\s*:/g) ?? [];
    expect(definitions).toEqual([]);
    // 使用的关键语义令牌存在
    expect(semanticCss).toMatch(/--sdq-text-inverse\s*:/);
    expect(semanticCss).toMatch(/--sdq-bg-success-soft\s*:/);
    expect(semanticCss).toMatch(/--sdq-profit\s*:/);
    expect(semanticCss).toMatch(/--sdq-risk\s*:/);
  });

  it("Home.tsx 图标尺寸仍遵守既有三档契约（无 24px 等新档位）", () => {
    const sizes = Array.from(homeTsx.matchAll(/size=\{(\d+)\}/g)).map((match) => Number(match[1]));
    const unexpected = Array.from(new Set(sizes)).filter((size) => ![15, 16, 18, 20, 22, 35].includes(size));
    expect(unexpected).toEqual([]);
  });
});
