// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
  trpcMocks.authData = undefined;
  trpcMocks.workspaceData = undefined;
  vi.unstubAllGlobals();
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

describe("统一账本的真实页面路径", () => {
  it("在真实 Home 中完成流水筛选、记一笔新增/编辑/删除、成本卡搜索与成本结构下钻", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();
    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "123.45");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "DOM 回归供应商");
    await user.clear(screen.getByPlaceholderText("例如：货品 / 补货"));
    await user.type(screen.getByPlaceholderText("例如：货品 / 补货"), "回归新增成本");
    await user.click(screen.getByRole("button", { name: "平台佣金" }));
    expect(screen.getByLabelText("上传凭证图片")).toMatchObject({ accept: "image/jpeg,image/png,image/webp", type: "file" });
    await user.click(screen.getByRole("checkbox", { name: "此笔已有线下凭证（仅标记）" }));
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    expect(screen.getByRole("heading", { name: "收入、成本，逐笔算清" })).toBeTruthy();
    expect(screen.getByText("DOM 回归供应商")).toBeTruthy();
    const recordSearch = screen.getByPlaceholderText("搜索商户、备注或分类");
    await user.type(recordSearch, "DOM 回归供应商");
    expect(screen.getByText("已找到 1 笔流水")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /DOM 回归供应商/ }));
    expect(screen.getByRole("heading", { name: "DOM 回归供应商" })).toBeTruthy();
    expect(screen.getByText(/已附凭证/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "编辑记录" }));
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "DOM 已编辑供应商");
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    await user.clear(screen.getByPlaceholderText("搜索商户、备注或分类"));
    await user.type(screen.getByPlaceholderText("搜索商户、备注或分类"), "DOM 已编辑供应商");
    const editedRecordRow = screen.getByRole("button", { name: /DOM 已编辑供应商/ });
    expect(editedRecordRow).toBeTruthy();
    await user.click(editedRecordRow);
    await user.click(screen.getByRole("button", { name: "删除记录" }));
    expect(screen.queryByRole("button", { name: /DOM 已编辑供应商/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "返回" }));
    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await screen.findByRole("navigation", { name: "主导航" });
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    const cardSearch = screen.getByPlaceholderText("搜索商品名称或类型");
    await user.type(cardSearch, "不存在的成本卡");
    expect(screen.getByText("没有匹配的成本卡。")).toBeTruthy();
    await user.clear(cardSearch);
    expect(screen.getByText("轻盈收纳盒")).toBeTruthy();

    await user.click(mainNavigation().getByRole("button", { name: "分析" }));
    const categoryDrilldown = screen.getAllByRole("button", { name: /平台佣金/ }).find((button) => button.textContent?.includes("查看流水"))
      ?? screen.getAllByRole("button", { name: /平台佣金/ })[0];
    await user.click(categoryDrilldown);
    expect((screen.getByPlaceholderText("搜索商户、备注或分类") as HTMLInputElement).value).toBe("平台佣金");
    confirmSpy.mockRestore();
  });
});

describe("流水私有凭证图片", () => {
  function prepareAuthenticatedWorkspace() {
    trpcMocks.authData = { id: "user-1", name: "测试经营者" };
    trpcMocks.workspaceData = [{ id: "workspace-test", name: "测试店铺", industryId: "ecommerce", contactName: "测试经营者", role: "owner" }];
  }

  it("选择图片后可预览、移除、保存资产关联，并在详情提供受保护预览入口", async () => {
    prepareAuthenticatedWorkspace();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "voucher-asset-1", url: "/api/media/voucher-asset-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    const voucherInput = screen.getByLabelText("上传凭证图片") as HTMLInputElement;
    const voucher = new File(["proof"], "voucher.png", { type: "image/png" });
    await user.upload(voucherInput, voucher);
    expect(await screen.findByAltText("已附凭证图片")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/media/upload", expect.objectContaining({ method: "POST", body: voucher, headers: expect.objectContaining({ "x-media-kind": "record_voucher", "x-workspace-id": "workspace-test", "x-subject-id": expect.stringMatching(/^record-/) }) }));

    await user.click(screen.getByRole("button", { name: "移除图片" }));
    expect(screen.queryByAltText("已附凭证图片")).toBeNull();
    await user.upload(screen.getByLabelText("上传凭证图片"), voucher);
    expect(await screen.findByAltText("已附凭证图片")).toBeTruthy();

    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "88.50");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "凭证回归供应商");
    await user.click(screen.getByRole("button", { name: "平台佣金" }));
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    const search = screen.getByPlaceholderText("搜索商户、备注或分类");
    await user.type(search, "凭证回归供应商");
    await user.click(screen.getByRole("button", { name: /凭证回归供应商/ }));
    expect(screen.getByText(/已附图片凭证/)).toBeTruthy();
    const preview = screen.getByRole("link", { name: /查看受保护凭证图片/ });
    expect(preview.getAttribute("href")).toBe("/api/media/voucher-asset-1");
  });

  it("上传失败时展示服务端错误，并保持保存前的无图片状态", async () => {
    prepareAuthenticatedWorkspace();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "凭证图片上传失败" }) }));
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await user.upload(screen.getByLabelText("上传凭证图片"), new File(["proof"], "voucher.png", { type: "image/png" }));

    expect((await screen.findByRole("alert")).textContent).toContain("凭证图片上传失败");
    expect(screen.queryByAltText("已附凭证图片")).toBeNull();
  });
});
