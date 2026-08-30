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

/** 跳转到订单 Tab（沿用既有 URL + popstate 导航）。 */
async function openOrders() {
  window.history.replaceState({}, "", "/?screen=orders");
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findByRole("heading", { name: "订单" });
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

describe("C4 订单页无订单空态：结果—原因—主行动", () => {
  it("无订单且无成本卡时渲染三段空态：结果标题、联动副文案、empty-action 主按钮与次入口", async () => {
    seedBook((saved) => {
      saved.orders = [];
      saved.skus = [];
      saved.cards = [];
    });
    renderHome();
    await openOrders();

    const empty = screen.getByTestId("orders-empty");
    // 结果标题 + 联动副文案
    expect(within(empty).getByText("本期尚无商品销售订单")).toBeTruthy();
    expect(within(empty).getByText(/联动收入、SKU 销量与成本快照/)).toBeTruthy();
    // 主按钮记录订单（empty-action 模式）
    const primary = within(empty).getByRole("button", { name: "记录订单" });
    expect(primary.className).toContain("empty-action");
    // 无成本卡 → 次入口「先建商品成本卡」显示
    expect(within(empty).getByRole("button", { name: "先建商品成本卡" })).toBeTruthy();
  });

  it("点击主按钮「记录订单」进入既有订单录入表单", async () => {
    const user = userEvent.setup();
    seedBook((saved) => {
      saved.orders = [];
    });
    renderHome();
    await openOrders();

    await user.click(within(screen.getByTestId("orders-empty")).getByRole("button", { name: "记录订单" }));
    expect(screen.getByRole("heading", { name: "记录订单" })).toBeTruthy();
  });

  it("已有成本卡（种子 SKU 存在）时隐藏次入口", async () => {
    seedBook((saved) => {
      saved.orders = [];
    });
    renderHome();
    await openOrders();

    const empty = screen.getByTestId("orders-empty");
    expect(within(empty).getByText("本期尚无商品销售订单")).toBeTruthy();
    expect(within(empty).queryByRole("button", { name: "先建商品成本卡" })).toBeNull();
  });

  it("无成本卡时点击次入口进入新建成本卡表单", async () => {
    const user = userEvent.setup();
    seedBook((saved) => {
      saved.orders = [];
      saved.skus = [];
      saved.cards = [];
    });
    renderHome();
    await openOrders();

    await user.click(screen.getByRole("button", { name: "先建商品成本卡" }));
    expect(screen.getByRole("heading", { name: /新增商品/ })).toBeTruthy();
  });

  it("有订单时渲染既有订单列表，不出现空态（回归）", async () => {
    seedBook((saved) => {
      saved.orders = [orderOn(saved, today, "c4-order-1", "C4-2026-0001", "回归买家", 6800)];
    });
    renderHome();
    await openOrders();

    expect(screen.queryByTestId("orders-empty")).toBeNull();
    expect(screen.getByText("C4-2026-0001")).toBeTruthy();
    expect(screen.getByText("回归买家")).toBeTruthy();
  });
});
