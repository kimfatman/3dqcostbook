// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { businessDate } from "@/lib/business-date";
import Home from "./Home";

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
      // 声明“减少动态”偏好：AnimatedChartValue 直接展示终值，且关闭轮播定时器避免竞态
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

/** 与 Home.tsx 同一业务日口径；趋势窗口为 [today-6, today]。 */
const today = businessDate();
function offsetDay(days: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 先挂载一次让演示种子写入 localStorage，随后按用例改写状态，再重新挂载。 */
function seedBook(mutate: (saved: any) => void) {
  const initial = renderHome();
  initial.unmount();
  const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
  mutate(saved);
  window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));
}

/** 构造一笔落在指定成交日的 ecommerce 订单（复用种子 SKU 与渠道定价快照）。 */
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

describe("首页近 7 日销售趋势空态（T8 · 空态与零值区分）", () => {
  it("7 日窗口内没有任何日粒度交易时渲染真实空态：结果/原因/下一步入口，入口走既有导航", async () => {
    const user = userEvent.setup();
    seedBook((saved) => {
      saved.entries = [];
      saved.orders = [];
      saved.refunds = [];
    });
    renderHome();

    const card = screen.getByTestId("home-sales-orders-empty");
    // 结果 + 原因 + 下一步（记一笔 / 记录订单）
    expect(within(card).getByText("近 7 日暂无已入账交易")).toBeTruthy();
    expect(within(card).getByText(/没有订单成交或流水入账/)).toBeTruthy();
    expect(within(card).getByRole("button", { name: /记录订单/ })).toBeTruthy();
    expect(within(card).getByRole("button", { name: /记一笔/ })).toBeTruthy();
    // 无交易时不渲染零值平线趋势图
    expect(screen.queryByTestId("home-sales-orders-trend")).toBeNull();

    // 记一笔 → 既有记一笔表单；返回一次即回到工作台
    await user.click(within(card).getByRole("button", { name: /记一笔/ }));
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByTestId("home-sales-orders-empty");

    // 记录订单 → 既有订单入账表单
    await user.click(within(screen.getByTestId("home-sales-orders-empty")).getByRole("button", { name: /记录订单/ }));
    expect(screen.getByRole("heading", { name: "记录订单" })).toBeTruthy();
  });

  it("窗口内有订单但中间日为真实零时，7 日柱与点全部渲染，零值柱保持零基线、不隐藏零值日", () => {
    seedBook((saved) => {
      saved.orders = [
        orderOn(saved, offsetDay(-6), "trend-order-1", "T-001", "回归客户 A", 6800),
        orderOn(saved, offsetDay(0), "trend-order-2", "T-002", "回归客户 B", 13600),
      ];
      saved.refunds = [];
    });
    renderHome();

    const card = screen.getByTestId("home-sales-orders-trend");
    const bars = card.querySelectorAll(".sales-bars > span");
    const points = card.querySelectorAll(".sales-orders-point");
    expect(bars.length).toBe(7);
    expect(points.length).toBe(7);

    const heights = Array.from(bars).map((bar) => (bar.querySelector("i") as HTMLElement).style.height);
    // 首日与末日有成交：真实比例高度；中间 5 个零值日为 2% 零基线（不隐藏、不伪造非零）
    expect(heights[0]).toBe("50%");
    expect(heights.slice(1, 6).every((height) => height === "2%")).toBe(true);
    expect(heights[6]).toBe("100%");

    // 汇总为真实成交额与订单数
    expect(within(card).getByText("¥204.00")).toBeTruthy();
    expect(within(card).getByText("2 笔")).toBeTruthy();
  });

  it("窗口内有已入账流水但无订单成交时保持真实零值趋势，不降级为空态也不伪造非零", () => {
    seedBook((saved) => {
      const seedEntry = saved.entries.find((entry: { status: string; industryId: string }) => entry.status === "posted" && entry.industryId === "ecommerce");
      saved.entries = [{
        ...seedEntry,
        id: "window-flow-1",
        occurredAt: today,
        merchant: "窗口流水回归",
        note: "仅流水无订单",
        createdAt: `${today}T12:00:00.000Z`,
        updatedAt: `${today}T12:00:00.000Z`,
      }];
      saved.orders = [];
      saved.refunds = [];
    });
    renderHome();

    // 有交易（已入账流水）→ 不显示空态，渲染真实趋势
    expect(screen.queryByTestId("home-sales-orders-empty")).toBeNull();
    const card = screen.getByTestId("home-sales-orders-trend");
    const bars = card.querySelectorAll(".sales-bars > span");
    expect(bars.length).toBe(7);
    expect(Array.from(bars).every((bar) => (bar.querySelector("i") as HTMLElement).style.height === "2%")).toBe(true);
    expect(card.querySelectorAll(".sales-orders-point").length).toBe(7);
    expect(within(card).getAllByText("¥0.00").length).toBeGreaterThan(0);
    expect(within(card).getAllByText("0 笔").length).toBeGreaterThan(0);
  });
});
