// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { businessPeriod } from "@/lib/business-date";
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

/** 先挂载一次让演示种子写入 localStorage，随后按用例改写状态，再重新挂载。 */
function seedBook(mutate: (saved: any) => void) {
  const initial = renderHome();
  initial.unmount();
  const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
  mutate(saved);
  window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));
}

/** 跳转到指定子页（沿用既有 URL + popstate 导航）。 */
async function openScreen(screenName: string, heading: string) {
  window.history.replaceState({}, "", `/?screen=${screenName}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findByRole("heading", { name: heading });
}

/** 与 Home.tsx 同一金额格式化口径（沿用现有格式化）。 */
const format = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yuan = (amount: number) => `¥${format.format(Number.isFinite(amount) ? amount : 0)}`;

/** 与 Home.tsx 同一 periods 口径：固定月份 + 当期业务月，取最后三个月。 */
const reportPeriods = () => Array.from(new Set(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", businessPeriod()])).sort();

describe("C5 报表列表速览行：净营收 / 经营利润", () => {
  it("每行在既有信息下追加净营收/经营利润速览行，数值来自报表快照字段（沿用现有格式化）", async () => {
    const [m1, m2, m3] = reportPeriods().slice(-3);
    seedBook((saved) => {
      saved.entries = [];
      saved.closedReports = [
        { id: "c5-report-a", workspaceId: "workspace-main", industryId: "ecommerce", month: m3, revenue: 123456.78, cost: 34567.89, margin: 88888.89, grossMarginRate: 72, operatingMarginRate: 50, status: "closed", snapshot: [] },
        { id: "c5-report-b", workspaceId: "workspace-main", industryId: "ecommerce", month: m2, revenue: null, cost: 1000, margin: 0, grossMarginRate: 0, operatingMarginRate: 0, status: "closed", snapshot: [] },
      ];
    });
    renderHome();
    await openScreen("reports", "经营报表");

    // 全部报表行（封存 + 草稿）都带速览行
    expect(screen.getAllByTestId(/^report-overview-/).length).toBe(3);

    // 封存快照行：真实快照字段（净营收 = revenue，经营利润 = revenue − cost），沿用 yuan 格式化
    expect(screen.getByText(`净营收 ${yuan(123456.78)} · 经营利润 ${yuan(123456.78 - 34567.89)}`)).toBeTruthy();

    // 空值行：净营收/经营利润均显示 —，不伪造
    expect(screen.getByText("净营收 — · 经营利润 —")).toBeTruthy();

    // 无数据草稿行：既有信息保留，速览行按零显示（沿用现有格式化，不虚构）
    const draftOverview = screen.getByTestId(`report-overview-ecommerce-${m1}-draft`);
    expect(draftOverview.textContent).toBe(`净营收 ${yuan(0)} · 经营利润 ${yuan(0)}`);
  });

  it("点击报表行仍进入既有报表详情（主进入点行为不破）", async () => {
    const [, , m3] = reportPeriods().slice(-3);
    seedBook((saved) => {
      saved.entries = [];
      saved.closedReports = [
        { id: "c5-report-a", workspaceId: "workspace-main", industryId: "ecommerce", month: m3, revenue: 123456.78, cost: 34567.89, margin: 88888.89, grossMarginRate: 72, operatingMarginRate: 50, status: "closed", snapshot: [] },
      ];
    });
    const user = userEvent.setup();
    renderHome();
    await openScreen("reports", "经营报表");

    await user.click(screen.getByText(`净营收 ${yuan(123456.78)} · 经营利润 ${yuan(123456.78 - 34567.89)}`));
    expect(screen.getByRole("heading", { name: /月报/ })).toBeTruthy();
    expect(screen.getByText(/经营利润率 50%/)).toBeTruthy();
  });
});

describe("C5 供应商行收敛：整行进入编辑，编辑/删除收进更多菜单", () => {
  it("整行点击进入编辑表单（主进入点），键盘 Enter 同样生效", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 商品采购供应商" });
    await user.click(row);
    expect(screen.getByRole("heading", { name: "编辑供应商" })).toBeTruthy();
    expect((screen.getByLabelText("供应商名称") as HTMLInputElement).value).toBe("商品采购供应商");
  });

  it("键盘 Enter 触发整行进入编辑", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 平台佣金服务商" });
    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "编辑供应商" })).toBeTruthy();
    expect((screen.getByLabelText("供应商名称") as HTMLInputElement).value).toBe("平台佣金服务商");
  });

  it("更多菜单收纳编辑/删除；从菜单编辑仍进入同一表单", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 商品采购供应商" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    expect(within(row).getByRole("button", { name: "编辑供应商" })).toBeTruthy();
    expect(within(row).getByRole("button", { name: "删除供应商" })).toBeTruthy();

    await user.click(within(row).getByRole("button", { name: "编辑供应商" }));
    expect(screen.getByRole("heading", { name: "编辑供应商" })).toBeTruthy();
  });

  it("删除保留既有确认流程：确认后删除并提示，历史流水保留（行为不变）", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 商品采购供应商" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    await user.click(within(row).getByRole("button", { name: "删除供应商" }));

    expect(confirmSpy).toHaveBeenCalledWith("确认删除供应商“商品采购供应商”吗？历史流水不会删除。");
    expect(screen.getByRole("status").textContent).toBe("供应商已删除，历史流水已保留");
    expect(screen.queryByRole("button", { name: "编辑供应商 商品采购供应商" })).toBeNull();
    confirmSpy.mockRestore();
  });

  it("删除取消确认则不改动列表", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderHome();
    await openScreen("suppliers", "供应商");

    const row = screen.getByRole("button", { name: "编辑供应商 商品采购供应商" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    await user.click(within(row).getByRole("button", { name: "删除供应商" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "编辑供应商 商品采购供应商" })).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it("搜索与行业/共享分组回归不破", async () => {
    const user = userEvent.setup();
    seedBook((saved) => {
      saved.suppliers.push({ id: "c5-shared-1", workspaceId: "workspace-main", industryIds: ["shared"], name: "跨行业共享供应商", contact: "共享联系人", categoryKey: "goods_purchase", spend: 9999, orders: 2, trend: "up" });
    });
    renderHome();
    await openScreen("suppliers", "供应商");

    expect(screen.getByRole("heading", { name: "当前行业" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "共享供应商" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "编辑供应商 跨行业共享供应商" })).toBeTruthy();

    // 搜索跨分组过滤
    await user.type(screen.getByPlaceholderText("搜索供应商、联系人或分类"), "共享");
    expect(screen.getByRole("button", { name: "编辑供应商 跨行业共享供应商" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "编辑供应商 商品采购供应商" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "当前行业" })).toBeNull();

    // 无匹配时沿用既有空态
    await user.clear(screen.getByPlaceholderText("搜索供应商、联系人或分类"));
    await user.type(screen.getByPlaceholderText("搜索供应商、联系人或分类"), "不存在的供应商");
    expect(screen.getByText("没有匹配的供应商。")).toBeTruthy();
  });
});

describe("C5 分类行收敛：整行进入编辑，删除保留确认与占用校验", () => {
  it("整行点击进入编辑表单（主进入点）", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("categories", "分类管理");

    const row = screen.getByRole("button", { name: "编辑分类 商品采购" });
    await user.click(row);
    expect(screen.getByRole("heading", { name: "编辑分类" })).toBeTruthy();
    expect((screen.getByLabelText("分类名称") as HTMLInputElement).value).toBe("商品采购");
  });

  it("更多菜单收纳编辑/删除，编辑仍进入同一表单", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreen("categories", "分类管理");

    const row = screen.getByRole("button", { name: "编辑分类 商品采购" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    expect(within(row).getByRole("button", { name: "编辑分类" })).toBeTruthy();
    expect(within(row).getByRole("button", { name: "删除分类" })).toBeTruthy();

    await user.click(within(row).getByRole("button", { name: "编辑分类" }));
    expect(screen.getByRole("heading", { name: "编辑分类" })).toBeTruthy();
  });

  it("删除占用分类：确认后仍被占用校验拦截，分类保留并提示原因（失败路径）", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderHome();
    await openScreen("categories", "分类管理");

    const row = screen.getByRole("button", { name: "编辑分类 商品采购" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    await user.click(within(row).getByRole("button", { name: "删除分类" }));

    expect(confirmSpy).toHaveBeenCalledWith("确认删除分类“商品采购”吗？已关联的账本记录会保留原口径。");
    expect(screen.getByRole("status").textContent).toBe("该分类下仍有关联流水，无法删除");
    expect(screen.getByRole("button", { name: "编辑分类 商品采购" })).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it("删除未占用分类：确认后删除成功，历史记录保留", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    seedBook((saved) => {
      saved.categories.push({ id: "c5-custom-cat", workspaceId: "workspace-main", industryId: "ecommerce", key: "c5_custom", label: "自定义分类", color: "#1677FF", hint: "测试用未占用分类", ledgerRole: "opex" });
    });
    renderHome();
    await openScreen("categories", "分类管理");

    const row = screen.getByRole("button", { name: "编辑分类 自定义分类" });
    await user.click(within(row).getByRole("button", { name: "更多操作" }));
    await user.click(within(row).getByRole("button", { name: "删除分类" }));

    expect(confirmSpy).toHaveBeenCalledWith("确认删除分类“自定义分类”吗？已关联的账本记录会保留原口径。");
    expect(screen.getByRole("status").textContent).toBe("分类已删除，历史记录已保留");
    expect(screen.queryByRole("button", { name: "编辑分类 自定义分类" })).toBeNull();
    confirmSpy.mockRestore();
  });
});
