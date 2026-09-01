// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { businessDate } from "@/lib/business-date";
import Home from "./Home";

/**
 * batch-02（C11 页面 P0 修复）回归：
 * 1. FAB 避让令牌（--sdq-space-fab-clearance ≥80px，所有带悬浮按钮页面消费）
 * 2. 标题重复（商品详情「商品成本详情」不再出现「商品商品」）
 * 3. 深色 hero 卡文字可读（text-inverse 系令牌，五皮肤 AA）
 * 4. 关键数据（订单实际到账/SKU单价、商品环比、瀑布图数值标签）
 * 5. 加载骨架 + 错误重试
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
const cashflowCss = readFileSync(resolve(__dirname, "../cashflow-filter.css"), "utf8");
const semanticCss = readFileSync(resolve(__dirname, "../tokens/semantic.css"), "utf8");

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

function mainNavigation() {
  return within(screen.getByRole("navigation", { name: "主导航" }));
}

/** 与 Home.tsx 同一业务日口径。 */
const today = businessDate();

/** 先挂载一次让演示种子写入 localStorage，随后按用例改写状态，再重新挂载。 */
function seedBook(mutate: (saved: any) => void) {
  const initial = renderHome();
  initial.unmount();
  const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
  mutate(saved);
  window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));
}

async function openScreenDirectly(screenName: string) {
  window.history.replaceState({}, "", `/?screen=${screenName}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function orderOn(saved: any, date: string, id: string, orderNo: string, buyer: string, unitPriceFen: number) {
  const sku = saved.skus.find((item: { id: string }) => item.id === "ecommerce-sku-1");
  const pricing = saved.workspace.channelPricing.platform;
  return {
    id, workspaceId: "workspace-main", industryId: "ecommerce", orderNo, channel: "platform", buyer,
    occurredAt: date, status: "paid",
    lines: [{ id: `line-${id}`, skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 1, refundedQuantity: 0, unitPriceFen, unitCostFen: sku.unitCostFen }],
    pricing, saleEntryId: `sale-${id}`, createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`,
  };
}

describe("batch-02 CSS 契约：FAB 避让令牌 ≥80px 且被所有带悬浮按钮页面消费", () => {
  it("定义 --sdq-space-fab-clearance，由导航+间距令牌派生且 ≥80px", () => {
    const match = semanticCss.match(/--sdq-space-fab-clearance:\s*([^;]+);/);
    expect(match).toBeTruthy();
    expect(match![1]).toContain("var(--sdq-height-nav)");
    expect(match![1]).toContain("var(--sdq-space-section)");
    // 56 + 24 + 16 = 96px ≥ 80px（不含安全区）
    expect(match![1]).toContain("var(--sdq-space-card)");
  });

  it("工作台/订单/商品/洞察根页容器底部消费避让令牌", () => {
    expect(indexCss).toMatch(/\.app-content\s*\{\s*padding:\s*16px 16px var\(--sdq-space-fab-clearance\)/);
    expect(indexCss).toMatch(/\.sub-content\s*\{\s*padding-bottom:\s*var\(--sdq-space-fab-clearance\)/);
    expect(indexCss).toMatch(/\.prototype-products\s*\{[^}]*padding-bottom:\s*var\(--sdq-space-fab-clearance\)/);
    expect(indexCss).toMatch(/\.prototype-analysis\s*\{[^}]*padding-bottom:\s*var\(--sdq-space-fab-clearance\)/);
    expect(cashflowCss).toMatch(/\.ledger-page-shell\s*\{[^}]*padding-bottom:\s*var\(--sdq-space-fab-clearance\)/);
  });

  it("每个根 Tab 页面确实渲染固定记一笔按钮（FAB 存在），且列表页渲染 list-primary", async () => {
    const user = userEvent.setup();
    renderHome();
    // 工作台根页
    expect(screen.getByRole("button", { name: "新增记一笔" })).toBeTruthy();
    // 订单根页：global-record-fab + 底部 list-primary
    await user.click(mainNavigation().getByRole("button", { name: "订单" }));
    expect(screen.getByRole("button", { name: "新增记一笔" })).toBeTruthy();
    expect(document.querySelector(".prototype-orders .list-primary")).toBeTruthy();
    // 商品根页
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    expect(screen.getByRole("button", { name: "新增记一笔" })).toBeTruthy();
    expect(document.querySelector(".prototype-products .list-primary")).toBeTruthy();
    // 洞察根页
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("button", { name: "新增记一笔" })).toBeTruthy();
  });
});

describe("batch-02 CSS 契约：深色 hero 卡文字使用 text-inverse 系令牌", () => {
  it("定义 text-inverse 派生令牌（color-mix + 语义令牌，非硬编码）", () => {
    expect(semanticCss).toContain("--sdq-text-inverse-secondary: color-mix(in srgb, var(--sdq-text-on-brand) 72%, transparent)");
    expect(semanticCss).toContain("--sdq-text-inverse-tertiary: color-mix(in srgb, var(--sdq-text-on-brand) 55%, transparent)");
    // 深色皮肤同样本地派生（deep/midnight 覆盖全部颜色类令牌）
    const deepCss = readFileSync(resolve(__dirname, "../skins/deep.css"), "utf8");
    const midnightCss = readFileSync(resolve(__dirname, "../skins/midnight.css"), "utf8");
    expect(deepCss).toContain("--sdq-text-inverse-secondary: color-mix(in srgb, var(--sdq-text-on-brand) 72%, transparent)");
    expect(midnightCss).toContain("--sdq-text-inverse-secondary: color-mix(in srgb, var(--sdq-text-on-brand) 72%, transparent)");
  });

  it("detail-hero 次要文字（span/p）不再使用 info/border-strong，改消费 text-inverse", () => {
    expect(indexCss).toMatch(/\.detail-hero > span\s*\{[^}]*var\(--sdq-text-inverse-secondary\)/);
    expect(indexCss).toMatch(/\.detail-hero p\s*\{[^}]*var\(--sdq-text-inverse-secondary\)/);
  });

  it("本期核算卡（equation-result）次级文字统一 text-inverse 系", () => {
    expect(indexCss).toMatch(/\.equation-result > span\s*\{[^}]*var\(--sdq-text-inverse-secondary\)/);
    expect(indexCss).toMatch(/\.equation-result label em\s*\{[^}]*var\(--sdq-text-inverse-secondary\)/);
    expect(indexCss).toMatch(/\.equation-result p\s*\{[^}]*var\(--sdq-text-inverse-tertiary\)/);
  });

  it("首页经营概览卡（home-decision）muted/line 由 --home-card-text 经 color-mix 派生，深色皮肤自动反色", () => {
    expect(indexCss).toMatch(/--home-card-muted:\s*color-mix\(in srgb, var\(--home-card-text\) 74%, transparent\)/);
    expect(indexCss).toMatch(/--home-card-line:\s*color-mix\(in srgb, var\(--home-card-text\) 24%, transparent\)/);
    expect(indexCss).toMatch(/\.home-decision-metrics dt\s*\{[^}]*var\(--home-card-muted\)/);
  });

  it("deep 皮肤售后卡改回令牌表面（bg-surface + text-primary/secondary），文字对比达标", () => {
    expect(cashflowCss).toMatch(/\.skin-deep \.order-after-sales-card\s*\{[^}]*background:\s*var\(--sdq-bg-surface\)/);
    expect(cashflowCss).toMatch(/\.skin-deep \.order-after-sales-card\s*\{[^}]*color:\s*var\(--sdq-text-primary\)/);
    expect(cashflowCss).toMatch(/\.skin-deep \.order-after-sales-head small[^}]*var\(--sdq-text-secondary\)/);
  });

  it("历史遗留 .dark 规则下 detail-hero 次要文字同样消费 text-inverse", () => {
    expect(indexCss).toMatch(/\.dark \.detail-hero :is\(p, span, em\)\s*\{\s*color:\s*var\(--sdq-text-inverse-secondary\)/);
  });
});

describe("batch-02 标题重复：商品详情「商品商品成本详情」→「商品成本详情」", () => {
  it("商品详情页头部标题为「商品成本详情」，页面任意位置不出现「商品商品」", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));
    expect(screen.getByRole("button", { name: "编辑成本" })).toBeTruthy();

    const headerTitle = document.querySelector(".sub-header strong")?.textContent || "";
    expect(headerTitle).toBe("商品成本详情");
    expect(headerTitle).not.toContain("商品商品");
    expect(screen.queryByText(/商品商品/)).toBeNull();
  });

  it("全局无「商品商品 / 订单订单 / 经营经营」拼接残留（Home.tsx 源码契约）", () => {
    const homeSource = readFileSync(resolve(__dirname, "./Home.tsx"), "utf8");
    expect(homeSource).not.toContain("商品商品");
    expect(homeSource).not.toContain("订单订单");
    expect(homeSource).not.toContain("经营经营");
  });
});

describe("batch-02 关键数据：订单详情 SKU 明细 / 退款金额 / 实际到账", () => {
  it("订单详情展示 SKU 成交单价、退款金额与手续费、实际到账（成交 − 退款）", async () => {
    seedBook((saved) => {
      saved.orders = [orderOn(saved, today, "b2-order-1", "B2-2026-0001", "批次二买家", 6800)];
      saved.refunds = [{
        id: "b2-refund-1", workspaceId: "workspace-main", industryId: "ecommerce",
        orderId: "b2-order-1", orderLineId: "line-b2-order-1", skuId: "ecommerce-sku-1",
        quantity: 1, refundFen: 3000, refundFeeFen: 100, reason: "quality_issue",
        recoveryStatus: "sellable_restocked", recoveredCostFen: 1500,
        occurredAt: today, refundEntryId: "b2-refund-entry", createdAt: `${today}T12:00:00.000Z`,
      }];
    });
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "订单" }));
    await user.click(screen.getByRole("button", { name: /B2-2026-0001/ }));

    // 售后后经营口径卡：实际到账行 = 成交 6800分 − 退款 3000分 = 3800分 = ¥38.00
    const arrivedRow = screen.getByText("实际到账").parentElement!;
    expect(within(arrivedRow).getByText("¥38.00")).toBeTruthy();
    // SKU 成交明细：单价
    expect(screen.getByText(/单价 ¥68.00/)).toBeTruthy();
    // 退款记录：原因 + 金额 + 手续费
    expect(screen.getByText("质量问题")).toBeTruthy();
    expect(screen.getByText(/¥30.00 · 手续费 ¥1.00/)).toBeTruthy();
  });
});

describe("batch-02 关键数据：商品详情成本构成 / 利润率 / 环比变化", () => {
  it("商品详情展示成本构成、本期核算毛利率与近 6 月环比变化", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));
    expect(screen.getByRole("button", { name: "编辑成本" })).toBeTruthy();

    // 成本构成公式
    expect(screen.getByText("成本构成")).toBeTruthy();
    // 本期核算（售价 − 单位成本 = 单件利润，含毛利率；marginRate 为数字，44.0 渲染为 44%）
    expect(screen.getByText("本期核算")).toBeTruthy();
    expect(screen.getByText(/毛利率 44%/)).toBeTruthy();
    // 环比变化（种子 history 末尾 31 → 30，较上月下降 ¥1.00）
    const delta = screen.getByTestId("cost-history-delta");
    expect(within(delta).getByText("较上月")).toBeTruthy();
    expect(within(delta).getByText(/−¥1\.00 · 3\.2%/)).toBeTruthy();
  });
});

describe("batch-02 关键数据：洞察页利润构成瀑布图各项数值标签", () => {
  it("瀑布图四段（净营收/销售成本/经营费用/经营利润）均带数值与标签", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();

    const heading = screen.getByRole("heading", { name: "利润构成" });
    const waterfall = heading.closest("section")!;
    const revenue = within(waterfall).getByRole("button", { name: /净营收/ });
    const cogs = within(waterfall).getByRole("button", { name: /销售成本/ });
    const expenses = within(waterfall).getByRole("button", { name: /经营费用/ });
    const profit = within(waterfall).getByRole("button", { name: /经营利润/ });
    // 每一段都同时渲染金额与文字标签
    for (const step of [revenue, cogs, expenses, profit]) {
      expect(step.textContent).toMatch(/¥/);
    }
    expect(within(waterfall).getAllByText(/毛利/).length).toBeGreaterThan(0);
    expect(within(waterfall).getByText(/毛利率/)).toBeTruthy();
  });
});

describe("batch-02 加载骨架与错误重试", () => {
  it("个人与店铺资料加载中展示骨架屏（role=status），非空白", async () => {
    trpcMocks.authLoading = true;
    renderHome();
    await openScreenDirectly("profileSettings");
    const skeleton = await screen.findByRole("status", { name: "正在加载个人与店铺资料" });
    expect(skeleton.className).toContain("profile-skeleton");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("个人与店铺资料读取失败展示错误提示（role=alert）+ 重新加载重试按钮", async () => {
    renderHome();
    await openScreenDirectly("profileSettings");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("个人与店铺资料暂时无法读取");
    expect(within(alert).getByRole("button", { name: "重新加载" })).toBeTruthy();
  });
});
