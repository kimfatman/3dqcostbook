// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import Home from "./Home";

vi.mock("@/lib/trpc", () => {
  const queryResult = () => ({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });
  const mutationResult = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    trpc: {
      auth: { me: { useQuery: queryResult }, logout: { useMutation: mutationResult } },
      workspace: {
        list: { useQuery: queryResult },
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

type IndustryScenario = {
  label: string;
  cardsTab: string;
  entity: string;
  templateUnit: string;
  cardUnit: string;
  cardName: string;
  category: string;
  budget: string;
};

const scenarios: IndustryScenario[] = [
  { label: "餐饮", cardsTab: "菜品", entity: "菜品", templateUnit: "份", cardUnit: "份", cardName: "水煮鱼", category: "食材采购", budget: "160000" },
  { label: "零售", cardsTab: "商品", entity: "商品", templateUnit: "件", cardUnit: "件", cardName: "云朵枕套", category: "商品采购", budget: "150000" },
  { label: "电商", cardsTab: "商品", entity: "商品", templateUnit: "件", cardUnit: "件", cardName: "轻盈收纳盒", category: "平台佣金", budget: "150000" },
  { label: "美业服务", cardsTab: "项目", entity: "服务项目", templateUnit: "次", cardUnit: "次", cardName: "轻氧小气泡", category: "产品耗材", budget: "125000" },
  { label: "小商贩", cardsTab: "货品", entity: "货品", templateUnit: "件", cardUnit: "份", cardName: "夜市烤肠", category: "进货成本", budget: "68000" },
];

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

function mainNavigation() {
  return within(screen.getByRole("navigation", { name: "主导航" }));
}

async function openProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(mainNavigation().getByRole("button", { name: "我的" }));
}

describe("五行业模板的真实页面显示", () => {
  it("沿实际导航切换五个行业，并在成本卡/SKU、资料、预算和分析页显示对应实体、分类与单位", async () => {
    const user = userEvent.setup();
    render(<Home />);

    for (const scenario of scenarios) {
      await openProfile(user);
      await user.click(screen.getByRole("button", { name: /经营行业/ }));
      await user.click(screen.getByRole("button", { name: new RegExp(`^${scenario.label}`) }));
      await user.click(screen.getByRole("button", { name: `使用${scenario.label}模板` }));

      expect(screen.getByText((text) => text.includes(`${scenario.label}经营者`))).toBeTruthy();
      await user.click(mainNavigation().getByRole("button", { name: "经营" }));
      expect(screen.getAllByText(new RegExp(`${scenario.label} ·`)).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: `${scenario.entity}成本` })).toBeTruthy();

      const cardsTab = mainNavigation().getByRole("button", { name: scenario.cardsTab });
      expect(cardsTab.getAttribute("aria-current")).toBeNull();
      await user.click(cardsTab);
      expect(mainNavigation().getByRole("button", { name: scenario.cardsTab }).getAttribute("aria-current")).toBe("page");
      expect(screen.getByRole("heading", { name: `${scenario.entity}成本` })).toBeTruthy();
      const addCardButtons = screen.getAllByRole("button", { name: `新增${scenario.entity}成本卡` });
      await user.click(addCardButtons.at(-1)!);
      expect((screen.getByRole("textbox", { name: "计量单位" }) as HTMLInputElement).value).toBe(scenario.templateUnit);
      await user.click(screen.getByRole("button", { name: "取消并返回" }));
      await user.click(screen.getByRole("button", { name: new RegExp(scenario.cardName) }));
      expect(screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent?.includes(`/ ${scenario.cardUnit}`) === true)).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /查看 SKU 经营/ }));
      expect(screen.getByRole("heading", { name: `SKU ${scenario.entity}成本` })).toBeTruthy();
      expect(screen.getByText(new RegExp(`售 0${scenario.cardUnit}`))).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "返回" }));
      await user.click(screen.getByRole("button", { name: "返回" }));

      await openProfile(user);
      await user.click(screen.getByRole("button", { name: /经营预算/ }));
      expect(screen.getByRole("heading", { name: /预算管理/ })).toBeTruthy();
      expect((screen.getByRole("spinbutton", { name: "调整后的月度预算金额" }) as HTMLInputElement).value).toBe(scenario.budget);
      await user.click(screen.getByRole("button", { name: "返回" }));

      await user.click(mainNavigation().getByRole("button", { name: "分析" }));
      expect(screen.getByRole("heading", { name: /成本分析/ })).toBeTruthy();
      expect(screen.getAllByText(scenario.category).length).toBeGreaterThan(0);
      const detailsTrigger = screen.getByRole("button", { name: /趋势与风险复核/ });
      if (detailsTrigger.getAttribute("aria-expanded") !== "true") await user.click(detailsTrigger);
      expect(screen.getByRole("heading", { name: `${scenario.label}潜在漏损` })).toBeTruthy();
    }
  });
});
