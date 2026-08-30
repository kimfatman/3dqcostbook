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

/** 构造一笔落在指定日期的电商流水（金额以分存储，展示两位）。 */
function recordEntry(id: string, date: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    workspaceId: "workspace-main",
    industryId: "ecommerce",
    templateVersion: 2,
    occurredAt: date,
    eventType: "expense",
    ledgerRole: "opex",
    cashDirection: "outflow",
    amountFen: 12000,
    categoryKey: "goods_purchase",
    merchant: "测试商户",
    note: "",
    status: "posted",
    hasAttachment: false,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
    ...overrides,
  };
}

/** 跳转到经营流水子页（沿用既有 URL + popstate 导航，不经过模块级常量）。 */
async function openRecords() {
  window.history.replaceState({}, "", "/?screen=records");
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findAllByTestId("record-group");
}

/** 与 Home.tsx dateLabel 同口径的固定日期文案。 */
function dateLabelFor(date: string) {
  return date === today ? "今天" : date === offsetDay(-1) ? "昨天" : `${date.slice(5).replace("-", " 月 ")} 日`;
}

describe("C2 经营流水扫描效率：日期分组与金额列", () => {
  it("按日期分组渲染：组标题显示日期（沿用 dateLabel）与当日笔数小计，同组流水连续排列", async () => {
    const older = offsetDay(-40);
    seedBook((saved) => {
      saved.entries = [
        recordEntry("c2-group-a", today, { merchant: "今日支出甲", amountFen: 12345 }),
        recordEntry("c2-group-b", today, { merchant: "今日收入乙", eventType: "income", ledgerRole: "other_income", cashDirection: "inflow", categoryKey: "other_income", amountFen: 8888 }),
        recordEntry("c2-group-c", offsetDay(-1), { merchant: "昨日支出", amountFen: 6600 }),
        recordEntry("c2-group-d", older, { merchant: "更早支出", amountFen: 4321 }),
      ];
    });
    renderHome();
    await openRecords();

    const groups = screen.getAllByTestId("record-group");
    expect(groups.length).toBe(3);
    expect(groups[0].getAttribute("data-date")).toBe(today);
    expect(groups[1].getAttribute("data-date")).toBe(offsetDay(-1));
    expect(groups[2].getAttribute("data-date")).toBe(older);

    // 组标题沿用 dateLabel 格式（今天 / 昨天 / MM 月 DD 日）
    expect(within(groups[0]).getByText("今天")).toBeTruthy();
    expect(within(groups[1]).getByText("昨天")).toBeTruthy();
    expect(within(groups[2]).getByText(dateLabelFor(older))).toBeTruthy();

    // 当日笔数小计
    expect(within(groups[0]).getByTestId("record-group-count").textContent).toBe("2 笔");
    expect(within(groups[1]).getByTestId("record-group-count").textContent).toBe("1 笔");
    expect(within(groups[2]).getByTestId("record-group-count").textContent).toBe("1 笔");

    // 同组流水连续排列
    const todayRows = within(groups[0]).getAllByTestId("record-row");
    expect(todayRows.length).toBe(2);
    expect(within(todayRows[0]).getByText("今日支出甲")).toBeTruthy();
    expect(within(todayRows[1]).getByText("今日收入乙")).toBeTruthy();
  });

  it("金额列使用 record-amount 类；收入沿用 income 语义类，等宽两位展示", async () => {
    seedBook((saved) => {
      saved.entries = [
        recordEntry("c2-amount-expense", today, { merchant: "支出商户", amountFen: 123456 }),
        recordEntry("c2-amount-income", today, { merchant: "收入商户", eventType: "income", ledgerRole: "other_income", cashDirection: "inflow", categoryKey: "other_income", amountFen: 654321 }),
      ];
    });
    renderHome();
    await openRecords();

    const amounts = screen.getAllByTestId("record-amount");
    expect(amounts.length).toBe(2);

    // 支出行：record-amount，无 income
    expect(amounts[0].className).toContain("record-amount");
    expect(amounts[0].className).not.toContain("income");
    expect(amounts[0].textContent).toBe("−¥1,234.56");

    // 收入行：record-amount + income（沿用既有 income 语义，不新增色值）
    expect(amounts[1].className).toContain("record-amount");
    expect(amounts[1].className).toContain("income");
    expect(amounts[1].textContent).toBe("+¥6,543.21");
  });

  it("金额列对齐样式标记与辅助降权令牌（CSS 回归）", () => {
    const baseCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const amountRule = /\.record-row > \.record-amount \{([^}]*)\}/.exec(baseCss)?.[1] || "";
    // 右对齐 + 等宽金融字体 + 固定最小宽度，保证纵向扫描金额严格对齐
    expect(amountRule).toContain("text-align: right");
    expect(amountRule).toContain("font-family: var(--sdq-financial-font)");
    expect(amountRule).toContain("min-width:");
    expect(amountRule).toContain("font-variant-numeric: tabular-nums");
    // 收入沿用 income 语义令牌，支出沿用 cost 语义令牌（不新增色值）
    expect(baseCss).toContain(".record-row > strong.income { color: var(--sdq-income); }");
    expect(amountRule).toContain("color: var(--sdq-cost)");
    // 辅助降权：商户/备注/凭证等非关键信息用 neutral-400/500 且字号 ≥11px
    expect(baseCss).toContain(".record-row > .record-main b { color: var(--sdq-neutral-500); font-size: 12px;");
    expect(baseCss).toContain(".record-row > .record-main em { margin-top: 0; color: var(--sdq-neutral-400); font-size: 11px;");
  });

  it("搜索筛选后分组正确：仅保留匹配日期的组且笔数小计正确", async () => {
    seedBook((saved) => {
      saved.entries = [
        recordEntry("c2-filter-a", today, { merchant: "广告投放专属", amountFen: 10000 }),
        recordEntry("c2-filter-b", today, { merchant: "普通采购", amountFen: 20000 }),
        recordEntry("c2-filter-c", offsetDay(-1), { merchant: "昨日专属商户", amountFen: 30000 }),
      ];
    });
    renderHome();
    await openRecords();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("搜索商户、备注或分类"), "专属");

    const groups = screen.getAllByTestId("record-group");
    expect(groups.length).toBe(2);
    expect(groups[0].getAttribute("data-date")).toBe(today);
    expect(groups[1].getAttribute("data-date")).toBe(offsetDay(-1));
    expect(within(groups[0]).getByTestId("record-group-count").textContent).toBe("1 笔");
    expect(within(groups[1]).getByTestId("record-group-count").textContent).toBe("1 笔");
    expect(within(groups[0]).getAllByTestId("record-row").length).toBe(1);
    expect(within(groups[0]).getByTestId("record-row").textContent).toContain("广告投放");
    expect(screen.queryByText("普通采购")).toBeNull();
  });

  it("类型筛选后分组只保留对应类型，笔数小计正确（既有筛选回归）", async () => {
    seedBook((saved) => {
      saved.entries = [
        recordEntry("c2-type-a", today, { merchant: "支出甲", amountFen: 10000 }),
        recordEntry("c2-type-b", today, { merchant: "收入乙", eventType: "income", ledgerRole: "other_income", cashDirection: "inflow", categoryKey: "other_income", amountFen: 20000 }),
        recordEntry("c2-type-c", offsetDay(-1), { merchant: "支出丙", amountFen: 30000 }),
      ];
    });
    renderHome();
    await openRecords();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /成本/ }));

    const groups = screen.getAllByTestId("record-group");
    expect(groups.length).toBe(2);
    expect(within(groups[0]).getByTestId("record-group-count").textContent).toBe("1 笔");
    expect(within(groups[1]).getByTestId("record-group-count").textContent).toBe("1 笔");
    expect(within(groups[0]).getByText("支出甲")).toBeTruthy();
    expect(within(groups[1]).getByText("支出丙")).toBeTruthy();
    expect(screen.queryByText("收入乙")).toBeNull();
  });

  it("点击流水行进入详情、返回回到列表；月份筛选仍按既有逻辑生效（详情跳转回归）", async () => {
    const olderMonth = offsetDay(-40);
    seedBook((saved) => {
      saved.entries = [
        recordEntry("c2-detail-a", today, { merchant: "今日流水", amountFen: 10000 }),
        recordEntry("c2-detail-b", olderMonth, { merchant: "更早流水", amountFen: 20000 }),
      ];
    });
    renderHome();
    await openRecords();

    const user = userEvent.setup();

    // 点击行 → 流水详情（行为不变）
    await user.click(screen.getByRole("button", { name: /今日流水/ }));
    expect(screen.getByRole("heading", { name: "今日流水" })).toBeTruthy();
    expect(screen.getByText("流水详情")).toBeTruthy();

    // 返回 → 流水列表
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findAllByTestId("record-group");
    expect(screen.getAllByTestId("record-group").length).toBe(2);

    // 月份筛选：仅保留更早月份的组（既有月份筛选逻辑）
    const olderMonthKey = olderMonth.slice(0, 7);
    await user.selectOptions(screen.getByLabelText("筛选流水月份"), olderMonthKey);
    const groups = screen.getAllByTestId("record-group");
    expect(groups.length).toBe(1);
    expect(groups[0].getAttribute("data-date")).toBe(olderMonth);
    expect(screen.queryByText("今日流水")).toBeNull();
  });
});
