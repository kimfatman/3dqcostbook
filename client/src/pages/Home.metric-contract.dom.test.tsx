// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { buildPeriodSkuMetrics, buildSkuRankings } from "@/lib/chart-metrics";
import { businessPeriod } from "@/lib/business-date";
import { buildMetrics, entriesForPeriod } from "@/lib/ledger-metrics";
import Home, { SkuTopBars } from "./Home";

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

function mainNavigation() {
  return within(screen.getByRole("navigation", { name: "主导航" }));
}

function renderHome() {
  return render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
}

/** 在真实 Store（demo 种子账本）中写入当期 ecommerce 订单，随后重新挂载。 */
function seedEcommerceOrders() {
  const period = businessPeriod();
  const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
  const sku = saved.skus.find((item: { id: string }) => item.id === "ecommerce-sku-1");
  const pricing = saved.workspace.channelPricing.platform;
  const createdAt = `${period}-12T12:00:00.000Z`;
  saved.orders = [
    { id: "contract-order-1", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "CT-001", channel: "platform", buyer: "契约回归客户 A", occurredAt: `${period}-12`, status: "paid", lines: [{ id: "contract-line-1", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 2, refundedQuantity: 0, unitPriceFen: 6800, unitCostFen: sku.unitCostFen }], pricing, saleEntryId: "", createdAt, updatedAt: createdAt },
    { id: "contract-order-2", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "CT-002", channel: "platform", buyer: "契约回归客户 B", occurredAt: `${period}-13`, status: "paid", lines: [{ id: "contract-line-2", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 3, refundedQuantity: 0, unitPriceFen: 6800, unitCostFen: sku.unitCostFen }], pricing, saleEntryId: "", createdAt, updatedAt: createdAt },
  ];
  window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));
  return { saved, period, sku };
}

describe("商品排行字段契约", () => {
  it("洞察页商品毛利排行锁定销量=数量+行业单位、毛利=￥金额（不含单位）", async () => {
    const initial = renderHome();
    initial.unmount();
    seedEcommerceOrders();

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));

    const rows = document.querySelectorAll(".analysis-profit-sku-list > button");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of Array.from(rows)) {
      const em = row.querySelector("em")?.textContent || "";
      const strong = row.querySelector("strong")?.textContent || "";
      // 销量行：数量 + 行业单位（不含 ￥）；净营收单独带 ￥
      expect(em).toMatch(/^\d+件 · 净营收 ¥[\d,]+\.\d{2}$/);
      expect(em).not.toContain("￥");
      // 毛利行：￥ 金额，不带单位
      expect(strong).toMatch(/^¥[\d,]+\.\d{2}$/);
      expect(strong).not.toMatch(/件$/);
    }
  });

  it("SkuTopBars 销量行=数量+行业单位（不含￥）、利润行=￥金额（不含单位）", () => {
    const initial = renderHome();
    initial.unmount();
    const { saved, period } = seedEcommerceOrders();
    const ranking = buildSkuRankings(buildPeriodSkuMetrics({ skus: saved.skus, orders: saved.orders, refunds: saved.refunds || [], period }));
    expect(ranking.sales.length).toBeGreaterThan(0);
    expect(ranking.profit.length).toBeGreaterThan(0);

    const sales = render(<ThemeProvider defaultTheme="light" switchable><SkuTopBars title="商品销量 Top 5" type="sales" items={ranking.sales} onSelect={() => {}} onEmpty={() => {}} /></ThemeProvider>);
    for (const row of Array.from(sales.container.querySelectorAll(".home-sku-ranking > div > button"))) {
      const label = row.querySelector("label")?.textContent || "";
      expect(label).toMatch(/^\d+件$/);
      expect(label).not.toContain("¥");
    }
    sales.unmount();

    const profit = render(<ThemeProvider defaultTheme="light" switchable><SkuTopBars title="商品利润 Top 5" type="profit" items={ranking.profit} onSelect={() => {}} onEmpty={() => {}} /></ThemeProvider>);
    for (const row of Array.from(profit.container.querySelectorAll(".home-sku-ranking > div > button"))) {
      const label = row.querySelector("label")?.textContent || "";
      expect(label).toMatch(/^¥[\d,]+\.\d{2}$/);
      expect(label).not.toMatch(/件$/);
    }
    profit.unmount();
  });
});

describe("指标单元样式", () => {
  it("洞察页利润构成与经营概览：金额恒带￥、比率恒带%", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));

    // 利润构成：毛利=￥金额、毛利率/费用率=%
    const insights = document.querySelector(".waterfall-insights");
    expect(insights).toBeTruthy();
    const spans = Array.from(insights!.querySelectorAll("span"));
    const pick = (label: string) => spans.find((span) => span.querySelector("em")?.textContent === label);
    const grossProfit = pick("毛利");
    const grossMargin = pick("毛利率");
    const expenseRate = pick("费用率");
    expect(grossProfit?.querySelector("b")?.textContent).toMatch(/^¥[\d,]+\.\d{2}$/);
    expect(grossMargin?.querySelector("b")?.textContent).toMatch(/\d+(\.\d)?%$/);
    expect(expenseRate?.querySelector("b")?.textContent).toMatch(/\d+(\.\d)?%$/);

    // 经营利润率带 %
    expect(screen.getByText(/经营利润率 \d+(\.\d)?%/)).toBeTruthy();

    // 净营收/销售成本/经营费用均带 ￥
    const kpis = Array.from(document.querySelectorAll(".analysis-profit-kpis b")).map((node) => node.textContent || "");
    expect(kpis.length).toBe(3);
    for (const value of kpis) expect(value).toMatch(/^¥[\d,]+\.\d{2}$/);
  });
});

describe("销售目标超额建议", () => {
  it("目标完成率 119%/120% 不提示，121% 显示目标可能偏低建议", async () => {
    for (const rate of [119, 120, 121]) {
      cleanup();
      window.localStorage.clear();
      const initial = renderHome();
      initial.unmount();
      const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
      const period = businessPeriod();
      const revenue = buildMetrics(entriesForPeriod(saved.entries, "ecommerce", period), saved.workspace.budgets.ecommerce).netRevenueFen / 100;
      saved.workspace.salesTargets.ecommerce = Math.round(revenue * 10000 / rate);
      window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

      const user = userEvent.setup();
      renderHome();
      await user.click(mainNavigation().getByRole("button", { name: "洞察" }));

      const ringRate = document.querySelector(".sales-target-ring b")?.textContent;
      expect(ringRate).toBe(`${rate}%`);
      if (rate === 121) {
        expect(document.querySelector(".sales-target-review")).toBeTruthy();
        expect(screen.getByText(/目标可能偏低，建议调整下月目标/)).toBeTruthy();
      } else {
        expect(document.querySelector(".sales-target-review")).toBeNull();
        expect(screen.queryByText(/目标可能偏低/)).toBeNull();
      }
    }
  });
});
