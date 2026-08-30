// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
      // 声明“减少动态”偏好，关闭轮播定时器，避免其重渲染与 userEvent 点击竞态导致 flaky
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

/** 沿真实导航进入智能定价页（电商模板默认数据：轻盈收纳盒，成本 38.1，建议价 63.50）。 */
async function openPricingPage(user: ReturnType<typeof userEvent.setup>) {
  await user.click(mainNavigation().getByRole("button", { name: "商品" }));
  await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));
  await user.click(screen.getByRole("button", { name: "测算定价" }));
  expect(await screen.findByRole("heading", { name: "先算保本，再定售价" })).toBeTruthy();
}

describe("C6 智能定价深色块收敛（P1-6，仅展示层）", () => {
  it("整页深色容器不超过 1 个：仅建议结果卡承载深海军蓝", async () => {
    const user = userEvent.setup();
    renderHome();
    await openPricingPage(user);

    // 深色容器由结果卡独占标记，全页恰好 1 个
    const navySurfaces = document.querySelectorAll('[data-tone="navy"]');
    expect(navySurfaces.length).toBeLessThanOrEqual(1);
    expect(navySurfaces.length).toBe(1);
    expect(navySurfaces[0].classList.contains("pricing-recommend")).toBe(true);

    // 成本基数卡与趋势图卡不再承载深色语义
    expect(document.querySelector(".pricing-base")?.getAttribute("data-tone")).toBeNull();
    expect(document.querySelector(".pricing-profit-trend")?.getAttribute("data-tone")).toBeNull();
  });

  it("趋势图卡与次级模拟区回白卡：保留类名且趋势卡不再嵌套在深色结果卡内", async () => {
    const user = userEvent.setup();
    renderHome();
    await openPricingPage(user);

    const recommend = document.querySelector(".pricing-recommend")!;
    const trend = document.querySelector(".pricing-profit-trend")!;
    expect(trend).toBeTruthy();
    // 趋势卡是结果卡的兄弟节点（独立白卡），而非嵌套在深色结果卡内
    expect(recommend.contains(trend)).toBe(false);
    expect(recommend.parentElement).toBe(trend.parentElement);

    // 次级模拟区保留既有类名
    expect(document.querySelector(".pricing-simulator")).toBeTruthy();
    expect(document.querySelector(".pricing-plans")).toBeTruthy();

    // 趋势/模拟区都不携带深色容器标记
    expect(trend.getAttribute("data-tone")).toBeNull();
    expect(document.querySelector(".pricing-simulator")?.getAttribute("data-tone")).toBeNull();
    expect(document.querySelector(".pricing-plans")?.getAttribute("data-tone")).toBeNull();
  });

  it("既有定价回归不破：保本价、建议价、滑块拖动与写入路径保持可用", async () => {
    const user = userEvent.setup();
    renderHome();
    await openPricingPage(user);

    // 保本价与建议价结果区
    expect(screen.getByText("保本售价")).toBeTruthy();
    expect(screen.getByText(/建议售价 · 目标贡献毛利/)).toBeTruthy();
    expect(screen.getAllByText("¥38.10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("¥63.50").length).toBeGreaterThan(0);

    // 滑块存在且拖动后实时重算（不影响既有滑块逻辑）
    const slider = screen.getByRole("slider", { name: "拖动试算售价" }) as HTMLInputElement;
    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: "50" } });
    expect(await screen.findByText("当前试算价")).toBeTruthy();
    expect(screen.getAllByText("¥50.00").length).toBeGreaterThan(0);

    // 回到建议价按钮恢复建议值
    await user.click(screen.getByRole("button", { name: /回到建议价/ }));
    expect(screen.getAllByText("¥63.50").length).toBeGreaterThan(0);

    // 写入当前试算价 → 回到成本卡详情并持久化到账本
    await user.click(screen.getByRole("button", { name: "写入当前试算价" }));
    expect(await screen.findByText("当前售价")).toBeTruthy();
    expect(screen.getByText("¥63.50")).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const card = saved.cards.find((item: { name: string }) => item.name === "轻盈收纳盒");
    expect(card.salePrice).toBe(63.5);
  });
});
