// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

function mainNavigation() {
  return within(screen.getByRole("navigation", { name: "主导航" }));
}

function renderHome() {
  return render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
}

/** 打开洞察页并返回渐进复核区触发按钮。 */
async function openAnalysis() {
  const user = userEvent.setup();
  renderHome();
  await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
  expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
  return user;
}

function reviewTrigger() {
  return screen.getByRole("button", { name: /成本与结构复核/ });
}

describe("C3 洞察页渐进信息架构：首屏两组", () => {
  it("首屏固定两组：经营利润（结论+利润桥）与趋势与商品毛利，其余卡片进入渐进复核区且默认收起", async () => {
    await openAnalysis();

    // 两组轻量分组标题在场（首屏扫描锚点）
    expect(screen.getByText("经营利润", { selector: ".analysis-group-title" })).toBeTruthy();
    expect(screen.getByText("趋势与商品毛利", { selector: ".analysis-group-title" })).toBeTruthy();

    // 组一：经营利润结论 + 利润桥（利润构成）
    expect(screen.getAllByRole("heading", { name: "经营利润" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "利润构成" })).toBeTruthy();

    // 组二：利润趋势 + 商品毛利排行
    expect(screen.getByRole("heading", { name: "利润趋势" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "商品毛利排行" })).toBeTruthy();

    // 渐进复核区默认收起：触发按钮 aria-expanded=false，且内部卡片不在 DOM 中
    const trigger = reviewTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).toContain("可复核");
    expect(document.querySelector(".analysis-review-content")).toBeNull();
    expect(screen.queryByRole("heading", { name: "成本诊断" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "钱花在哪里" })).toBeNull();
    expect(screen.queryByRole("button", { name: /行业参考估算/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "经营报表" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "成本结构变化" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "成本归属 · 供应商" })).toBeNull();
  });

  it("展开渐进复核区后按现有顺序渲染全部卡片（成本诊断/结构/供应商等），并可再次收起", async () => {
    const user = await openAnalysis();

    await user.click(reviewTrigger());
    expect(reviewTrigger().getAttribute("aria-expanded")).toBe("true");

    // 展开后卡片齐全，且保持现有顺序
    const children = Array.from(document.querySelectorAll(".analysis-review-content > *"));
    const classes = children.map((node) => (node as HTMLElement).className);
    expect(classes[0]).toContain("analysis-cost-overview");
    expect(classes[1]).toContain("analysis-cost-composition");
    expect(classes[2]).toContain("analysis-risk-review");
    expect(classes[3]).toContain("analysis-control-hub");
    expect(classes[4]).toContain("analysis-target-management");
    expect(classes[5]).toContain("analysis-structure-compare");
    expect(classes[6]).toContain("analysis-supplier-rank");
    expect(screen.getByRole("heading", { name: "成本诊断" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "成本结构变化" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "成本归属 · 供应商" })).toBeTruthy();

    // 行业参考估算仍可独立展开（既有交互语言不被破坏）
    const riskTrigger = screen.getByRole("button", { name: /行业参考估算/ });
    expect(riskTrigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(riskTrigger);
    expect(screen.getByRole("heading", { name: /潜在漏损/ })).toBeTruthy();

    // 再次点击复核区触发按钮 → 收起，卡片回到渐进区
    await user.click(reviewTrigger());
    expect(reviewTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".analysis-review-content")).toBeNull();
  });

  it("展开/收起渐进复核区不影响首屏两组的数据断言", async () => {
    const user = await openAnalysis();

    const profitBefore = document.querySelector(".analysis-profit-total strong")?.textContent;
    const marginBefore = document.querySelector(".analysis-profit-total em")?.textContent;
    const kpisBefore = Array.from(document.querySelectorAll(".analysis-profit-kpis b")).map((node) => node.textContent);
    const waterfallLabel = document.querySelector(".waterfall-insights")?.getAttribute("aria-label");
    expect(profitBefore).toBeTruthy();
    expect(waterfallLabel).toBeTruthy();

    await user.click(reviewTrigger());
    expect(screen.getByRole("heading", { name: "成本诊断" })).toBeTruthy();

    expect(document.querySelector(".analysis-profit-total strong")?.textContent).toBe(profitBefore);
    expect(document.querySelector(".analysis-profit-total em")?.textContent).toBe(marginBefore);
    expect(Array.from(document.querySelectorAll(".analysis-profit-kpis b")).map((node) => node.textContent)).toEqual(kpisBefore);
    expect(document.querySelector(".waterfall-insights")?.getAttribute("aria-label")).toBe(waterfallLabel);

    await user.click(reviewTrigger());
    expect(document.querySelector(".analysis-profit-total strong")?.textContent).toBe(profitBefore);
  });

  it("分组标题与复核容器只引用语义令牌，深色皮肤可复用同一令牌层（CSS 回归）", () => {
    const baseCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    // 分组标题：11px 加粗，颜色指向页面语义令牌（浅色 = neutral-600，深色皮肤自动重指向）
    expect(baseCss).toContain(".analysis-group-title {");
    expect(baseCss).toContain("color: var(--analysis-muted);");
    expect(baseCss).toContain("font-size: 11px;");
    expect(baseCss).toContain("font-weight: 700;");
    // 复核容器复用 analysis-more 语言，表面/描边/阴影走令牌（--analysis-* → --sdq-*）
    expect(baseCss).toContain(".analysis-review {");
    expect(baseCss).toContain("background: var(--analysis-surface);");
    expect(baseCss).toContain("border-color: var(--analysis-line);");
    expect(baseCss).toContain(".analysis-review .analysis-more-trigger { color: var(--analysis-text); }");
    expect(baseCss).toContain(".analysis-review .analysis-more-trigger em { color: var(--analysis-muted); }");
    expect(baseCss).toContain(".analysis-review .analysis-more-trigger svg { color: var(--analysis-brand); }");
  });
});
