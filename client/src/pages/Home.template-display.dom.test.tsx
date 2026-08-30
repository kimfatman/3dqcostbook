// @vitest-environment jsdom
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

type IndustryScenario = {
  label: string;
  cardsTab: string;
  entity: string;
  costCardTitle: string;
  templateUnit: string;
  cardUnit: string;
  cardName: string;
  category: string;
  budget: string;
};

const scenarios: IndustryScenario[] = [
  { label: "餐饮", cardsTab: "菜品", entity: "菜品", costCardTitle: "菜品成本卡", templateUnit: "份", cardUnit: "份", cardName: "水煮鱼", category: "食材采购", budget: "160000" },
  { label: "零售", cardsTab: "商品", entity: "商品", costCardTitle: "商品成本卡", templateUnit: "件", cardUnit: "件", cardName: "云朵枕套", category: "商品采购", budget: "150000" },
  { label: "电商", cardsTab: "商品", entity: "商品", costCardTitle: "商品成本卡", templateUnit: "件", cardUnit: "件", cardName: "轻盈收纳盒", category: "平台佣金", budget: "150000" },
  { label: "美业服务", cardsTab: "项目", entity: "服务项目", costCardTitle: "服务项目成本卡", templateUnit: "次", cardUnit: "次", cardName: "轻氧小气泡", category: "产品耗材", budget: "125000" },
  { label: "小商贩", cardsTab: "货品", entity: "货品", costCardTitle: "货品成本卡", templateUnit: "件", cardUnit: "份", cardName: "夜市烤肠", category: "进货成本", budget: "68000" },
];

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      // 声明“减少动态”偏好，关闭 4.2s/5.2s 轮播定时器，避免其重渲染与 userEvent 点击竞态导致 flaky
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

async function openProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(mainNavigation().getByRole("button", { name: "我的" }));
}

async function expandRecordMoreInfo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /更多信息/ }));
}

/** 展开洞察页渐进复核区（成本诊断/结构对照/供应商归属等卡片默认收起，先展开再断言）。 */
async function expandAnalysisReview(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("button", { name: /成本与结构复核/ });
  if (trigger.getAttribute("aria-expanded") !== "true") await user.click(trigger);
}

describe("五行业模板的真实页面显示", () => {
  it("沿实际导航切换五个行业，并在成本卡/SKU、资料、预算和分析页显示对应实体、分类与单位", async () => {
    const user = userEvent.setup();
    renderHome();

    for (const scenario of scenarios) {
      await openProfile(user);
      await user.click(screen.getByRole("button", { name: /经营行业/ }));
      await user.click(screen.getByRole("button", { name: new RegExp(`^${scenario.label}`) }));
      await user.click(screen.getByRole("button", { name: `使用${scenario.label}模板` }));

      expect(screen.getByText((text) => text.includes(`${scenario.label}经营者`))).toBeTruthy();
      await user.click(mainNavigation().getByRole("button", { name: "工作台" }));
      expect(screen.getAllByText(new RegExp(`${scenario.label} ·`)).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: `添加${scenario.entity}` })).toBeNull();

      const cardsTab = mainNavigation().getByRole("button", { name: scenario.cardsTab });
      expect(cardsTab.getAttribute("aria-current")).toBeNull();
      await user.click(cardsTab);
      expect(mainNavigation().getByRole("button", { name: scenario.cardsTab }).getAttribute("aria-current")).toBe("page");
      expect(screen.getByRole("heading", { name: scenario.costCardTitle })).toBeTruthy();
      const addCardButtons = screen.getAllByRole("button", { name: `新增${scenario.entity}成本卡` });
      await user.click(addCardButtons.at(-1)!);
      expect((screen.getByRole("textbox", { name: "计量单位" }) as HTMLInputElement).value).toBe(scenario.templateUnit);
      await user.click(screen.getByRole("button", { name: "取消并返回" }));
      await user.click(screen.getByRole("button", { name: new RegExp(scenario.cardName) }));
      expect(screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent?.includes(`/ ${scenario.cardUnit}`) === true)).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /查看 SKU 经营/ }));
      expect(screen.getByRole("heading", { name: `SKU ${scenario.costCardTitle}` })).toBeTruthy();
      expect(screen.getByText(new RegExp(`售 0${scenario.cardUnit}`))).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "返回" }));
      await user.click(screen.getByRole("button", { name: "返回" }));

      await openProfile(user);
      await user.click(screen.getByRole("button", { name: /经营预算/ }));
      expect(screen.getByRole("heading", { name: /预算管理/ })).toBeTruthy();
      expect((screen.getByRole("spinbutton", { name: "调整后的月度预算金额" }) as HTMLInputElement).value).toBe(scenario.budget);
      await user.click(screen.getByRole("button", { name: "返回" }));

      await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
      expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
      await expandAnalysisReview(user);
      expect(screen.getAllByText(scenario.category).length).toBeGreaterThan(0);
      const detailsTrigger = screen.getByRole("button", { name: /行业参考估算/ });
      if (detailsTrigger.getAttribute("aria-expanded") !== "true") await user.click(detailsTrigger);
      expect(screen.getByRole("heading", { name: `${scenario.label}潜在漏损` })).toBeTruthy();
    }
  }, 12_000);
});

describe("首页第一期经营总览", () => {
  it("按店铺期间、经营结论和真实补充指标组织轻量工作台，并将消息收敛到顶栏入口", async () => {
    const user = userEvent.setup();
    renderHome();

    const home = document.querySelector(".home-redesign") as HTMLElement;
    expect(document.querySelector(".brand-seal")?.getAttribute("src")).toBe("/brand-assets/SDQ_Logo_Mark.png");
    const directSections = Array.from(home.children).map((node) => node.className);
    expect(directSections[0]).toContain("home-identity-context");
    expect(directSections[1]).toContain("home-decision");
    expect(directSections[2]).toContain("home-operational-metrics");
    expect(directSections[3]).toContain("home-sales-orders");
    expect(directSections[4]).toContain("analysis-profit-trend");
    expect(directSections[5]).toContain("home-reminders");
    expect(directSections).toHaveLength(6);

    const decisionCard = home.querySelector(".operating-snapshot.home-decision") as HTMLElement;
    expect(decisionCard).toBeTruthy();
    expect(decisionCard.classList.contains("is-empty")).toBe(true);
    expect(within(decisionCard).getByText("今天尚无已入账数据")).toBeTruthy();
    expect(within(decisionCard).getByText("从一笔流水或订单开始")).toBeTruthy();
    expect(within(decisionCard).getByRole("group", { name: "经营概览时间范围" })).toBeTruthy();

    const metricStrip = screen.getByTestId("home-operational-metrics");
    expect(within(metricStrip).getByText("订单数")).toBeTruthy();
    expect(within(metricStrip).getByText("客单价")).toBeTruthy();
    expect(within(metricStrip).getByText("退款影响")).toBeTruthy();
    expect(within(metricStrip).getByText("今天暂无退款")).toBeTruthy();

    const rangeSwitcher = screen.getByRole("group", { name: "经营概览时间范围" });
    expect(within(rangeSwitcher).getByRole("button", { name: "今天" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("今天尚无已入账数据")).toBeTruthy();
    await user.click(within(rangeSwitcher).getByRole("button", { name: "本月" }));
    expect(within(rangeSwitcher).getByRole("button", { name: "本月" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("较上月同期")).toBeTruthy();
    await user.click(within(rangeSwitcher).getByRole("button", { name: "本周" }));
    expect(within(rangeSwitcher).getByRole("button", { name: "本周" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("本周尚无已入账数据")).toBeTruthy();
    await user.click(within(rangeSwitcher).getByRole("button", { name: "今天" }));

    expect(screen.queryByTestId("home-quick-entry")).toBeNull();
    expect(screen.getByRole("button", { name: "新增记一笔" })).toBeTruthy();

    expect(screen.queryByText("销售额 / 订单数")).toBeNull();
    expect(screen.queryByTestId("home-recent-activity")).toBeNull();
    expect(home.querySelector('[data-chart-template="profit-line"]')).toBeTruthy();
    expect(home.querySelector(".home-reminders")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /消息中心/ }).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /消息中心/ })[0]);
    expect(screen.getAllByText("消息中心").length).toBeGreaterThan(0);
  });

  it("当天只有成本时显式显示亏损与不可计算的净营收比率，不误显示为盈利或零比率", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "99");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "今日亏损回归成本");
    await user.click(screen.getByRole("button", { name: "平台佣金" }));
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByRole("navigation", { name: "主导航" });

    expect(screen.getAllByText("经营亏损").length).toBeGreaterThan(1);
    expect(screen.getAllByText("−¥99.00").length).toBeGreaterThan(0);
    expect(screen.getByText("成本 / 净营收")).toBeTruthy();
    expect(screen.getByText("利润 / 净营收")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(1);
    expect(screen.queryByText("优先处理")).toBeNull();
  });

  it("录入真实订单后工作台展示近 7 日销售趋势卡，最近动态仍收敛到流水页", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "订单" }));
    await user.click(within(screen.getByTestId("orders-empty")).getByRole("button", { name: "记录订单" }));
    await user.click(screen.getByRole("button", { name: "确认订单并入账" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByRole("navigation", { name: "主导航" });

    expect(screen.getByRole("heading", { name: "订单" })).toBeTruthy();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "利润趋势" })).toBeTruthy();
    await user.click(mainNavigation().getByRole("button", { name: "工作台" }));
    expect(screen.getByTestId("home-sales-orders-trend")).toBeTruthy();
    expect(screen.queryByTestId("home-recent-activity")).toBeNull();
  });
});

describe("统一账本的真实页面路径", () => {
  it("切换收入、支出与退款时刷新可用标签，并允许在记一笔中新增可复用的自定义标签", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    const recordTypeButtons = Array.from(document.querySelectorAll(".record-form .type-switch > button")) as HTMLButtonElement[];
    expect(screen.getByText("支出标签")).toBeTruthy();
    expect(screen.getByRole("button", { name: "平台佣金" })).toBeTruthy();

    await user.click(recordTypeButtons[1]);
    expect(screen.getByText("收入标签")).toBeTruthy();
    expect(screen.getByRole("button", { name: "其他收入" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "平台佣金" })).toBeNull();

    const incomeTagField = screen.getByText("收入标签").closest("label") as HTMLElement;
    await user.click(incomeTagField.querySelector(".category-custom-trigger") as HTMLButtonElement);
    await user.type(screen.getByLabelText("自定义收入标签"), "押金收入");
    await user.click(screen.getByRole("button", { name: "添加" }));
    expect(screen.getByRole("button", { name: "押金收入" })).toBeTruthy();

    await user.click(recordTypeButtons[0]);
    expect(screen.getByText("支出标签")).toBeTruthy();
    await user.click(recordTypeButtons[1]);
    expect(screen.getByRole("button", { name: "押金收入" })).toBeTruthy();

    await user.click(recordTypeButtons[3]);
    expect(screen.getByText("退款标签")).toBeTruthy();
  });

  it("将记一笔中的商品销售转入订单入账，其他收入不伪装为 SKU 销售", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    expect(screen.getByRole("button", { name: "商品销售" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "其他收入" }));
    expect(screen.getByText(/其他收入不生成订单、SKU 销量、客单价或商品利润/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "商品销售" }));
    expect(screen.getByRole("heading", { name: "记录订单" })).toBeTruthy();
    expect(screen.getByText(/订单会冻结当前渠道佣金、履约费用/)).toBeTruthy();
    await user.type(screen.getByPlaceholderText("例如：PDD-20260714-001"), "MANUAL-SKU-001");
    await user.click(screen.getByRole("button", { name: "确认订单并入账" }));
    expect(screen.getByRole("heading", { name: "订单" })).toBeTruthy();
    expect(screen.getByText("MANUAL-SKU-001")).toBeTruthy();
  });

  it("在真实 Home 中完成流水筛选、记一笔新增/编辑/删除、成本卡搜索与成本结构下钻", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHome();
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();
    await expandRecordMoreInfo(user);
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
    expect(screen.getAllByText("经营流水")).toHaveLength(1);
    expect(screen.getAllByLabelText("导出当前筛选账单")).toHaveLength(1);
    const recordSearch = screen.getByPlaceholderText("搜索商户、备注或分类");
    await user.type(recordSearch, "DOM 回归供应商");
    expect(screen.getByText("已找到 1 笔流水")).toBeTruthy();
    expect(screen.getAllByLabelText("导出当前筛选账单")).toHaveLength(1);

    await user.clear(recordSearch);
    await user.type(recordSearch, "不存在的流水");
    expect(screen.getByText("没有匹配的流水")).toBeTruthy();
    expect(screen.queryByLabelText("导出当前筛选账单")).toBeNull();
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(screen.getByText("DOM 回归供应商")).toBeTruthy();
    expect(screen.getAllByLabelText("导出当前筛选账单")).toHaveLength(1);

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

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "经营利润" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "利润构成" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "利润趋势" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "商品毛利排行" })).toBeTruthy();
    await expandAnalysisReview(user);
    const costStructure = screen.getByText("钱花在哪里").closest("section");
    expect(costStructure).toBeTruthy();
    const categoryDrilldown = within(costStructure as HTMLElement).getAllByRole("button", { name: /平台佣金/ })[0];
    await user.click(categoryDrilldown);
    expect(await screen.findByText(/数据下钻：平台佣金/, {}, { timeout: 3000 })).toBeTruthy();
    expect((await screen.findByPlaceholderText("搜索商户、备注或分类") as HTMLInputElement).value).toBe("");
    confirmSpy.mockRestore();
  }, 15_000);
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
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
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
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    await user.upload(screen.getByLabelText("上传凭证图片"), new File(["proof"], "voucher.png", { type: "image/png" }));

    expect((await screen.findByRole("alert")).textContent).toContain("凭证图片上传失败");
    expect(screen.queryByAltText("已附凭证图片")).toBeNull();
  });
});

describe("成本分析供应商排行与结构对照", () => {
  it("无已关联支出时保留行动空态，不伪造供应商棒棒糖排行", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);
    expect(screen.getByText("尚未关联供应商支出")).toBeTruthy();
    expect(document.querySelector(".supplier-lollipop")).toBeNull();
    expect(screen.getByRole("button", { name: /在成本记录里关联供应商/ })).toBeTruthy();
  });

  it("上期无成本基线时保留饼形结构、分组对比零柱和分类下钻，不伪造上期占比", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const currentPeriod = new Date().toISOString().slice(0, 7);
    saved.entries = saved.entries.filter((entry: { industryId: string; occurredAt: string }) => entry.industryId !== "ecommerce" || entry.occurredAt.startsWith(currentPeriod));
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    expect(document.querySelector(".template-cost-pie .analysis-cost-pie")).toBeTruthy();
    const comparison = document.querySelector(".template-grouped-structure");
    expect(comparison).toBeTruthy();
    expect(within(comparison as HTMLElement).getByText("对比结论")).toBeTruthy();
    expect(within(comparison as HTMLElement).getByText(/点击任一分类可查看/)).toBeTruthy();
    const priorBar = comparison?.querySelector(".analysis-grouped-bars > i.previous") as HTMLElement;
    expect(priorBar.style.width).toBe("0%");
    const firstCategory = within(comparison as HTMLElement).getAllByRole("button")[0];
    expect(firstCategory.textContent).toContain("上期 0%");
    await user.click(firstCategory);
    expect(screen.getByText(/数据下钻：商品采购/)).toBeTruthy();
  });

  it("将已关联供应商的真实支出展示在排行中，并能下钻到该供应商的当期流水", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "66.60");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "供应商排行回归支出");
    await user.selectOptions(screen.getByRole("combobox", { name: /关联供应商/ }), "ecommerce-supplier-1");
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    await user.click(screen.getByRole("button", { name: "返回" }));
    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    expect(screen.getByRole("heading", { name: "成本归属 · 供应商" })).toBeTruthy();
    expect(document.querySelector(".template-cost-pie .analysis-cost-pie")).toBeTruthy();
    expect(document.querySelector(".template-grouped-structure .analysis-grouped-bars")).toBeTruthy();
    const supplierButton = screen.getByRole("button", { name: /商品采购供应商.*占已关联成本/ });
    expect(supplierButton.querySelector(".supplier-lollipop")).toBeTruthy();
    expect(supplierButton.textContent).toContain("¥66.60");
    await user.click(supplierButton);
    expect(screen.getByText("供应商排行回归支出")).toBeTruthy();
  });
});

describe("图表主题", () => {
  it("允许用户在外观设置中切换图表深色模式", async () => {
    const user = userEvent.setup();
    renderHome();

    await openProfile(user);
    await user.click(screen.getByRole("button", { name: /外观设置/ }));
    const toggle = screen.getByRole("button", { name: /图表深色模式/ });
    await user.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByText("深色已开启")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /图表深色模式/ }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("间接费用项与智能定价的统一布局", () => {
  it("在间接费用项页使用不重复的内容标题，并保留费用录入和摊销控件", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);
    await user.click(screen.getByRole("button", { name: /间接费用项/ }));

    expect(screen.getByRole("heading", { name: "间接费用项" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "新增间接费用项" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "费用类型" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "一键摊销" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "保存并一键摊销" })).toBeTruthy();
  });

  it("在智能定价页保留成本、渠道输入、保本价和连续试算结果区", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));
    await user.click(screen.getByRole("button", { name: "测算定价" }));

    expect(screen.getByRole("heading", { name: "先算保本，再定售价" })).toBeTruthy();
    expect(screen.getByText("当前单位完全成本")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "销售渠道" })).toBeTruthy();
    expect(screen.getByText("保本售价")).toBeTruthy();
    expect(screen.getByText(/建议售价 · 目标贡献毛利/)).toBeTruthy();
    expect(screen.getByRole("slider", { name: "拖动试算售价" })).toBeTruthy();
  });
});

describe("全站信息精简", () => {
  it("移除泛化重复标签，同时保留首页、商品和成本分析的主信息层级", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByText("经营概览")).toBeTruthy();
    expect(screen.queryByText("核心经营结果")).toBeNull();
    expect(screen.queryByText("本月实时核算")).toBeNull();
    expect(screen.queryByText("未设目标")).toBeNull();
    expect(screen.queryByRole("button", { name: /设置本月销售目标/ })).toBeNull();

    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    expect(screen.getByRole("heading", { name: "商品成本卡" })).toBeTruthy();
    expect(screen.queryByText("清晰管理商品成本变化，提升单件利润")).toBeNull();
    expect(screen.getByPlaceholderText("搜索商品名称或类型")).toBeTruthy();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();
    await expandAnalysisReview(user);
    expect(screen.getByRole("button", { name: /设置本月销售目标/ })).toBeTruthy();
    expect(screen.queryByText("先看结论，再核对最需要处理的一项成本。")).toBeNull();
    expect(screen.getAllByRole("heading", { name: "经营利润" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "成本诊断" })).toBeTruthy();
  });
});

describe("成本诊断主题", () => {
  it("将净成本、最大驱动与真实流水下钻收束为首屏行动链", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    expect(screen.getByText("优先核对")).toBeTruthy();
    expect(screen.getByText(/商品采购.*占正向成本最多/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "钱花在哪里" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "成本结构变化" })).toBeTruthy();
    expect(screen.queryAllByText("持平")).toHaveLength(0);
    expect(screen.getAllByText("0pt").length).toBeGreaterThan(0);
    expect(screen.getByText("尚未关联供应商支出")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /优先核对.*商品采购/ }));
    expect(screen.getByRole("heading", { name: "收入、成本，逐笔算清" })).toBeTruthy();
  });
});

describe("成本诊断信息收束", () => {
  it("结构变化超过三类时默认只展示变化绝对值最大的三类，并可通过查看全部展开", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    const comparison = document.querySelector(".template-grouped-structure") as HTMLElement;
    expect(comparison).toBeTruthy();
    expect(comparison.querySelectorAll(".analysis-grouped-copy").length).toBe(3);
    const showAll = within(comparison).getByRole("button", { name: /查看全部 8 类/ });
    expect(within(comparison).queryAllByText("持平")).toHaveLength(0);
    expect(within(comparison).getAllByText("0pt").length).toBeGreaterThan(0);

    await user.click(showAll);
    expect(comparison.querySelectorAll(".analysis-grouped-copy").length).toBe(8);
    expect(within(comparison).queryByRole("button", { name: /查看全部/ })).toBeNull();
  });

  it("结构变化少于等于三类时全量展示，不出现展开入口", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const keptCategories = new Set(["goods_purchase", "platform_fee", "fulfillment"]);
    saved.entries = saved.entries.map((entry: { industryId: string; categoryKey: string; amountFen: number }) => entry.industryId === "ecommerce" && !keptCategories.has(entry.categoryKey) ? { ...entry, amountFen: 0 } : entry);
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    const comparison = document.querySelector(".template-grouped-structure") as HTMLElement;
    expect(comparison).toBeTruthy();
    expect(comparison.querySelectorAll(".analysis-grouped-copy").length).toBe(3);
    expect(within(comparison).queryByRole("button", { name: /查看全部/ })).toBeNull();
  });

  it("行业参考估算金额同一行带未入账标识，折叠摘要保留不计入利润说明", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);

    const detailsTrigger = screen.getByRole("button", { name: /行业参考估算/ });
    expect(detailsTrigger.textContent).toContain("不计入利润");
    if (detailsTrigger.getAttribute("aria-expanded") !== "true") await user.click(detailsTrigger);

    const estimate = document.querySelector(".analysis-hidden-cost-head > strong") as HTMLElement;
    expect(estimate).toBeTruthy();
    expect(estimate.querySelector("small")?.textContent).toBe("未入账 · 不计入利润");
    expect(estimate.textContent).toContain("未入账 · 不计入利润");
  });
});

describe("Dycharts 模板化图表信息层级", () => {
  it("保留原有业务入口，并展示定价关键价格点和利润桥比较读数", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));
    await user.click(screen.getByRole("button", { name: "测算定价" }));
    expect(screen.getByText("当前")).toBeTruthy();
    expect(screen.getByText("保本")).toBeTruthy();
    expect(screen.getByText("建议")).toBeTruthy();
    expect(screen.getByRole("slider", { name: "拖动试算售价" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getAllByText("毛利率").length).toBeGreaterThan(0);
    expect(screen.getByText("费用率")).toBeTruthy();
  });

  it("在排行、结构、目标和供应商场景复用受控模板，并保留各自真实空态", async () => {
    const user = userEvent.setup();
    renderHome();

    await openProfile(user);
    await user.click(screen.getByRole("button", { name: /经营预算/ }));
    expect(document.querySelector('[data-chart-template="bullet-goal"]')).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);
    expect(document.querySelector('[data-chart-template="rank"]')).toBeTruthy();
    expect(document.querySelector('[data-chart-template="pie"]')).toBeTruthy();
    expect(document.querySelector('[data-chart-template="grouped-bars"]')).toBeTruthy();
    expect(document.querySelector('.template-grouped-structure .analysis-grouped-bars')).toBeTruthy();
    expect(screen.getByText("尚未关联供应商支出")).toBeTruthy();
  });

  it("以真实订单与退款数据呈现退款帕累托模板，并保持原因下钻", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const period = new Date().toISOString().slice(0, 7);
    const sku = saved.skus.find((item: { id: string }) => item.id === "ecommerce-sku-1");
    const pricing = saved.workspace.channelPricing.platform;
    const createdAt = `${period}-12T12:00:00.000Z`;
    saved.orders = [
      { id: "template-order-1", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "TPL-001", channel: "platform", buyer: "模板回归客户 A", occurredAt: `${period}-12`, status: "partially_refunded", lines: [{ id: "template-line-1", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 2, refundedQuantity: 1, unitPriceFen: 6800, unitCostFen: sku.unitCostFen }], pricing, saleEntryId: "", createdAt, updatedAt: createdAt },
      { id: "template-order-2", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "TPL-002", channel: "platform", buyer: "模板回归客户 B", occurredAt: `${period}-13`, status: "partially_refunded", lines: [{ id: "template-line-2", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 2, refundedQuantity: 1, unitPriceFen: 6800, unitCostFen: sku.unitCostFen }], pricing, saleEntryId: "", createdAt, updatedAt: createdAt },
    ];
    saved.refunds = [
      { id: "template-refund-1", workspaceId: "workspace-main", industryId: "ecommerce", orderId: "template-order-1", orderLineId: "template-line-1", skuId: sku.id, quantity: 1, refundFen: 6800, refundFeeFen: 0, reason: "quality_issue", recoveryStatus: "not_returned", recoveredCostFen: 0, occurredAt: `${period}-14`, refundEntryId: "", createdAt },
      { id: "template-refund-2", workspaceId: "workspace-main", industryId: "ecommerce", orderId: "template-order-2", orderLineId: "template-line-2", skuId: sku.id, quantity: 1, refundFen: 6800, refundFeeFen: 0, reason: "wrong_item", recoveryStatus: "not_returned", recoveredCostFen: 0, occurredAt: `${period}-15`, refundEntryId: "", createdAt },
    ];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    expect(document.querySelectorAll('[data-chart-template="rank"]').length).toBe(0);
    await user.click(mainNavigation().getByRole("button", { name: "订单" }));
    expect(document.querySelector('[data-chart-template="pareto-rank"]')).toBeTruthy();
    const refundReason = screen.getByRole("button", { name: /质量问题.*累计/ });
    await user.click(refundReason);
    expect((screen.getByPlaceholderText("搜索订单号、客户或 SKU") as HTMLInputElement).value).toBe("质量问题");
  });
});

describe("第一批范围、待办与成本快照表达", () => {
  it("将月度待办收敛到全局消息中心，并从工作台和个人页移除平行入口", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByRole("button", { name: /消息中心/ })).toBeTruthy();
    expect(screen.getByText("本月经营提醒")).toBeTruthy();
    expect(screen.queryByText("本月待办")).toBeNull();
    expect(screen.queryByText("优先处理")).toBeNull();

    await openProfile(user);
    expect(screen.queryByText("本月待办")).toBeNull();
    expect(screen.queryByRole("button", { name: /本月经营提醒/ })).toBeNull();
  });

  it("在完成率高于120%时提示目标可能偏低建议，并复用既有目标编辑入口", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    saved.workspace.salesTargets.ecommerce = 100;
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);
    expect(screen.getByText(/目标可能偏低，建议调整下月目标/)).toBeTruthy();
    const review = screen.getByRole("button", { name: /复核目标/ });
    await user.click(review);
    expect(screen.getByRole("spinbutton", { name: "目标金额（元）" })).toBeTruthy();
  });

  it("在成本卡详情只读展示当前单位成本与最近成交冻结成本，无成交时保留明确缺口", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const card = saved.cards.find((item: { industryId: string }) => item.industryId === "ecommerce");
    const sku = saved.skus.find((item: { cardId?: string }) => item.cardId === card.id);
    const period = new Date().toISOString().slice(0, 7);
    const occurredAt = `${period}-18`;
    saved.orders = [{ id: "snapshot-order-1", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "SNAPSHOT-001", channel: "platform", buyer: "成本快照客户", occurredAt, status: "paid", lines: [{ id: "snapshot-line-1", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 1, refundedQuantity: 0, unitPriceFen: sku.unitPriceFen, unitCostFen: 1234 }], pricing: saved.workspace.channelPricing.platform, saleEntryId: "", createdAt: `${occurredAt}T12:00:00.000Z`, updatedAt: `${occurredAt}T12:00:00.000Z` }];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: new RegExp(card.name) }));

    expect(screen.getByText("订单成本快照")).toBeTruthy();
    expect(screen.getByText("当前单位成本")).toBeTruthy();
    expect(screen.getByText("最近成交冻结成本")).toBeTruthy();
    expect(screen.getByText(`¥12.34 / ${sku.unit}`)).toBeTruthy();
    expect(screen.getByText(/后续订单才使用当前成本/)).toBeTruthy();
  });

  it("关联SKU尚无成交时不伪造最近冻结成本", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: /轻盈收纳盒/ }));

    expect(screen.getByText("当前单位成本")).toBeTruthy();
    expect(screen.getByText("暂无历史成交成本快照")).toBeTruthy();
    expect(screen.getByText(/尚无关联 SKU 的成交订单/)).toBeTruthy();
  });
});

describe("第二批导航、列表效率与真实事件", () => {
  it("将工作台和洞察作为清晰的一级入口，并将皮肤与深色模式收进我的外观设置", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(mainNavigation().getByRole("button", { name: "工作台" })).toBeTruthy();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    expect(screen.getByRole("heading", { name: /经营洞察/ })).toBeTruthy();

    await openProfile(user);
    await user.click(screen.getByRole("button", { name: /外观设置/ }));
    expect(screen.getByRole("heading", { name: "外观设置" })).toBeTruthy();
    const toggle = screen.getByRole("button", { name: /图表深色模式/ });
    await user.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("允许仅对选中订单批量标记复核并按待复核筛选，不改写订单业务数据", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await user.click(screen.getByRole("button", { name: "商品销售" }));
    await user.type(screen.getByPlaceholderText("例如：PDD-20260714-001"), "BATCH-REVIEW-001");
    await user.click(screen.getByRole("button", { name: "确认订单并入账" }));
    expect(screen.getByText("BATCH-REVIEW-001")).toBeTruthy();

    const selection = screen.getByRole("checkbox", { name: /选择订单 BATCH-REVIEW-001/ });
    await user.click(selection);
    await user.click(screen.getByRole("button", { name: "标记复核" }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("1 笔已选订单标记为已复核"));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("仅更新复核状态"));
    expect(screen.getByText("已复核")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "待复核" }));
    expect(screen.queryByText("BATCH-REVIEW-001")).toBeNull();
    await user.click(screen.getByRole("button", { name: "全部" }));
    await user.click(screen.getByRole("checkbox", { name: /选择订单 BATCH-REVIEW-001/ }));
    confirmSpy.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "导出" }));
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining("1 笔已选订单的账务流水"));
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining("只读 CSV"));
    expect(screen.getByText("已选 1 笔")).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it("利润趋势仅展示可追溯的真实成交、退款或独立成本事件", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await user.click(screen.getByRole("button", { name: "商品销售" }));
    await user.type(screen.getByPlaceholderText("例如：PDD-20260714-001"), "EVENT-ORDER-001");
    await user.click(screen.getByRole("button", { name: "确认订单并入账" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));

    expect(document.querySelector(".profit-trend-events")).toBeTruthy();
    expect(screen.getByText(/订单成交/)).toBeTruthy();
    expect(screen.queryByText(/促销日/)).toBeNull();
    expect(screen.queryByText(/食材涨价日/)).toBeNull();
  });
});

describe("信息架构与入口收口", () => {
  it("将消息和正式经营报表分别收敛到顶栏铃铛与洞察，并从个人页移除重复入口", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));
    await expandAnalysisReview(user);
    expect(screen.getByRole("heading", { name: "经营报表" })).toBeTruthy();
    const allReportsButton = document.querySelector<HTMLButtonElement>(".analysis-report-hub .analysis-card-head > button");
    expect(allReportsButton).toBeTruthy();
    await user.click(allReportsButton!);
    expect(screen.getByRole("heading", { name: "经营报表" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));

    await openProfile(user);
    expect(screen.queryByRole("button", { name: /经营提醒|经营报表|成本报表/ })).toBeNull();
    expect(screen.getByRole("button", { name: /消息中心/ })).toBeTruthy();
    await user.click(mainNavigation().getByRole("button", { name: "工作台" }));
    await user.click(screen.getByRole("button", { name: /消息中心/ }));
    expect(screen.getAllByText("消息中心").length).toBeGreaterThan(0);
  });

  it("无商品成本卡时，记录订单直接进入订单前置引导并在原路径提供新建入口", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    saved.cards = [];
    saved.skus = [];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "订单" }));
    await user.click(within(screen.getByTestId("orders-empty")).getByRole("button", { name: "记录订单" }));

    expect(screen.getByRole("heading", { name: "记录订单" })).toBeTruthy();
    expect(screen.getByText("请先建商品成本卡")).toBeTruthy();
    expect(screen.getByRole("button", { name: "新建商品成本卡" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
  });
});

describe("全站排版舒展感与本地化", () => {
  it("在没有经营数据时以带标点的短句呈现利润构成空状态", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    saved.entries = [];
    saved.orders = [];
    saved.refunds = [];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "洞察" }));

    expect(screen.getByText("利润构成待生成")).toBeTruthy();
    expect(screen.getByText("记录商品销售后，将自动归集销售收入与已售成本。")).toBeTruthy();
  });
});

describe("T1 统一详情空态：结果—原因—主行动", () => {
  async function openScreenDirectly(screenName: string) {
    window.history.replaceState({}, "", `/?screen=${screenName}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  it("订单详情无上下文时展示结果文案、原因说明与回列表按钮，点击后回到订单列表", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("orderDetail");

    expect(await screen.findByText("订单不存在")).toBeTruthy();
    expect(screen.getByText(/该订单可能已被删除，或不属于当前行业/)).toBeTruthy();
    const back = screen.getByRole("button", { name: "回到订单列表" });
    expect(back.className).toContain("empty-action");
    await user.click(back);
    expect(screen.getByRole("heading", { name: "订单" })).toBeTruthy();
  });

  it("流水详情无上下文时展示结果文案、原因说明与回列表按钮，点击后回到流水列表", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("recordDetail");

    expect(await screen.findByText("记录不存在")).toBeTruthy();
    expect(screen.getByText(/该笔流水可能已被删除，或当前行业不可见/)).toBeTruthy();
    const back = screen.getByRole("button", { name: "回到流水列表" });
    expect(back.className).toContain("empty-action");
    await user.click(back);
    expect(screen.getByRole("heading", { name: "收入、成本，逐笔算清" })).toBeTruthy();
  });

  it("成本卡详情无上下文时展示结果文案、原因说明与回列表按钮，点击后回到成本卡列表", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("cardDetail");

    expect(await screen.findByText("成本卡不存在")).toBeTruthy();
    expect(screen.getByText(/该成本卡可能已被删除或归档/)).toBeTruthy();
    const back = screen.getByRole("button", { name: "回到成本卡列表" });
    expect(back.className).toContain("empty-action");
    await user.click(back);
    expect(screen.getByRole("heading", { name: "商品成本卡" })).toBeTruthy();
  });

  it("智能定价无选中成本卡时展示结果文案、原因说明与回列表按钮，点击后回到成本卡列表", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("pricing");

    expect(await screen.findByText("请先选择一张成本卡")).toBeTruthy();
    expect(screen.getByText(/需要先打开一张成本卡/)).toBeTruthy();
    const back = screen.getByRole("button", { name: "回到成本卡列表" });
    expect(back.className).toContain("empty-action");
    await user.click(back);
    expect(screen.getByRole("heading", { name: "商品成本卡" })).toBeTruthy();
  });
});

describe("第二批 T2 成本卡删除降级", () => {
  async function openCardDetail(user: ReturnType<typeof userEvent.setup>, cardName: string | RegExp) {
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(screen.getByRole("button", { name: new RegExp(cardName) }));
    expect(screen.getByRole("button", { name: "编辑成本" })).toBeTruthy();
  }

  it("详情主操作区收敛为编辑与测算定价，删除入口默认不在主操作区", async () => {
    const user = userEvent.setup();
    renderHome();
    await openCardDetail(user, "轻盈收纳盒");

    expect(screen.getByRole("button", { name: "编辑成本" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "测算定价" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "更多" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "删除成本卡" })).toBeNull();
    expect(screen.queryByRole("button", { name: "删除" })).toBeNull();
  });

  it("展开更多后可见删除，取消二次确认不触发删除", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHome();
    await openCardDetail(user, "轻盈收纳盒");

    await user.click(screen.getByRole("button", { name: "更多" }));
    const deleteButton = screen.getByRole("button", { name: "删除成本卡" });
    expect(deleteButton).toBeTruthy();
    await user.click(deleteButton);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("确认删除成本卡“轻盈收纳盒”"));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("删除仅影响成本卡本身，历史订单成本快照不受影响"));
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.getByText("轻盈收纳盒")).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it("确认路径走既有删除逻辑，成本卡被移除并回到列表", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHome();
    await openCardDetail(user, "轻盈收纳盒");

    await user.click(screen.getByRole("button", { name: "更多" }));
    await user.click(screen.getByRole("button", { name: "删除成本卡" }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("删除仅影响成本卡本身，历史订单成本快照不受影响"));
    expect(screen.getByRole("heading", { name: "商品成本卡" })).toBeTruthy();
    expect(screen.queryByText("轻盈收纳盒")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("有订单成本快照的成本卡不可删除：不弹确认、展示原因且成本卡保留", async () => {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    const card = saved.cards.find((item: { industryId: string }) => item.industryId === "ecommerce");
    const sku = saved.skus.find((item: { cardId?: string }) => item.cardId === card.id);
    const period = new Date().toISOString().slice(0, 7);
    saved.orders = [{ id: "protected-order-1", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "PROTECTED-001", channel: "platform", buyer: "保护快照客户", occurredAt: `${period}-18`, status: "paid", lines: [{ id: "protected-line-1", skuId: sku.id, skuCode: sku.code, skuName: sku.name, unit: sku.unit, quantity: 1, refundedQuantity: 0, unitPriceFen: sku.unitPriceFen, unitCostFen: 1234 }], pricing: saved.workspace.channelPricing.platform, saleEntryId: "", createdAt: `${period}-18T12:00:00.000Z`, updatedAt: `${period}-18T12:00:00.000Z` }];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));

    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHome();
    await openCardDetail(user, card.name);
    await user.click(screen.getByRole("button", { name: "更多" }));
    await user.click(screen.getByRole("button", { name: "删除成本卡" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/已有订单成本快照，不能删除/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.getByText(card.name)).toBeTruthy();
    confirmSpy.mockRestore();
  });
});

describe("第二批 T3 记一笔表单分层与连续录入", () => {
  function renderEmptyLedgerHome() {
    const initial = renderHome();
    initial.unmount();
    const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
    saved.entries = [];
    window.localStorage.setItem("sqd-mobile-book-v3", JSON.stringify(saved));
    return renderHome();
  }

  it("支出场景更多信息默认收起，展开后供应商、备注与凭证齐全可填写，并能走既有保存路径", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    expect(screen.queryByPlaceholderText("例如：平台服务商")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /关联供应商/ })).toBeNull();
    expect(screen.queryByLabelText("上传凭证图片")).toBeNull();
    const trigger = screen.getByRole("button", { name: /更多信息/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await expandRecordMoreInfo(user);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByPlaceholderText("例如：平台服务商")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /关联供应商/ })).toBeTruthy();
    expect(screen.getByPlaceholderText("例如：货品 / 补货")).toBeTruthy();
    expect(screen.getByLabelText("上传凭证图片")).toMatchObject({ accept: "image/jpeg,image/png,image/webp", type: "file" });

    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "31.40");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "折叠区保存回归");
    await user.type(screen.getByPlaceholderText("例如：货品 / 补货"), "展开后填写备注");
    await user.selectOptions(screen.getByRole("combobox", { name: /关联供应商/ }), "ecommerce-supplier-1");
    await user.click(screen.getByRole("checkbox", { name: "此笔已有线下凭证（仅标记）" }));
    await user.click(screen.getByRole("button", { name: "平台佣金" }));
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    const search = screen.getByPlaceholderText("搜索商户、备注或分类");
    await user.type(search, "折叠区保存回归");
    expect(screen.getByText("已找到 1 笔流水")).toBeTruthy();
    expect(screen.getByText(/展开后填写备注/)).toBeTruthy();
    expect(screen.getByText(/有凭证/)).toBeTruthy();
  });

  it("保存并继续后清空金额、对象、备注与凭证，保留日期、类型与标签选择并聚焦金额", async () => {
    const user = userEvent.setup();
    renderEmptyLedgerHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);

    const amountInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    const merchantInput = screen.getByPlaceholderText("例如：平台服务商") as HTMLInputElement;
    const noteInput = screen.getByPlaceholderText("例如：货品 / 补货") as HTMLInputElement;
    const dateInput = screen.getByLabelText("日期") as HTMLInputElement;
    const voucherCheckbox = screen.getByRole("checkbox", { name: "此笔已有线下凭证（仅标记）" }) as HTMLInputElement;
    const dateBefore = dateInput.value;

    await user.clear(amountInput);
    await user.type(amountInput, "55.50");
    await user.clear(merchantInput);
    await user.type(merchantInput, "连续录入供应商");
    await user.type(noteInput, "连续录入备注");
    await user.click(screen.getByRole("button", { name: "广告投放" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /关联供应商/ }), "ecommerce-supplier-4");
    await user.click(voucherCheckbox);

    await user.click(screen.getByRole("button", { name: "保存并继续" }));

    expect(screen.getByText("已保存，可继续录入")).toBeTruthy();
    expect(amountInput.value).toBe("");
    expect(merchantInput.value).toBe("");
    expect(noteInput.value).toBe("");
    expect(voucherCheckbox.checked).toBe(false);
    expect(dateInput.value).toBe(dateBefore);
    expect(document.querySelector(".record-form .type-switch button.selected")?.textContent).toBe("支出");
    expect(document.querySelector(".record-form .category-chips button.selected")?.textContent).toBe("广告投放");
    expect(document.activeElement).toBe(amountInput);

    // 保存已真实入账：再次进入表单时记住上一笔的标签与供应商
    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByRole("navigation", { name: "主导航" });
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    expect(document.querySelector(".record-form .category-chips button.selected")?.textContent).toBe("广告投放");
    expect((screen.getByRole("combobox", { name: /关联供应商/ }) as HTMLSelectElement).value).toBe("ecommerce-supplier-4");
  });

  it("手工退款类型不折叠更多信息，手续费与回收成本保留首屏", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await user.click(screen.getByRole("button", { name: "手工退款" }));

    expect(screen.getByRole("button", { name: /更多信息/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("退款金额")).toBeTruthy();
    expect(screen.getByText("退款手续费（可选）")).toBeTruthy();
    expect(screen.getByText("退货可回收成本（可选）")).toBeTruthy();
    expect(screen.getByPlaceholderText("例如：退款客户 / 平台订单")).toBeTruthy();
  });

  it("再次进入表单时默认选中上一次支出使用的标签与供应商", async () => {
    const user = userEvent.setup();
    renderEmptyLedgerHome();

    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "77.70");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "记住上次标签支出");
    await user.click(screen.getByRole("button", { name: "履约物流" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /关联供应商/ }), "ecommerce-supplier-3");
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    await user.click(screen.getByRole("button", { name: "返回" }));
    await screen.findByRole("navigation", { name: "主导航" });
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);

    expect(document.querySelector(".record-form .category-chips button.selected")?.textContent).toBe("履约物流");
    expect((screen.getByRole("combobox", { name: /关联供应商/ }) as HTMLSelectElement).value).toBe("ecommerce-supplier-3");
  });
});

describe("第二批 T4 凭证未保存离开提示", () => {
  function prepareAuthenticatedWorkspace() {
    trpcMocks.authData = { id: "user-1", name: "测试经营者" };
    trpcMocks.workspaceData = [{ id: "workspace-test", name: "测试店铺", industryId: "ecommerce", contactName: "测试经营者", role: "owner" }];
  }

  async function uploadVoucher(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "voucher-asset-1", url: "/api/media/voucher-asset-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await user.upload(screen.getByLabelText("上传凭证图片"), new File(["proof"], "voucher.png", { type: "image/png" }));
    expect(await screen.findByAltText("已附凭证图片")).toBeTruthy();
    return fetchMock;
  }

  it("上传凭证后尝试返回被拦截：确认层出现且含两个动作，留在本页可继续编辑", async () => {
    prepareAuthenticatedWorkspace();
    const user = userEvent.setup();
    renderHome();
    await uploadVoucher(user);

    await user.click(screen.getByRole("button", { name: "返回" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("放弃未保存的凭证？")).toBeTruthy();
    expect(within(dialog).getByText(/已上传的凭证图片尚未随流水保存，离开后将不保留/)).toBeTruthy();
    expect(within(dialog).getByText(/服务器暂存文件将按策略自动清理/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "留在本页" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "放弃凭证并离开" })).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "留在本页" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();
    expect(screen.getByAltText("已附凭证图片")).toBeTruthy();

    // 表单内类型切换不离开页面，不触发保护也不清空凭证
    const recordTypeButtons = Array.from(document.querySelectorAll(".record-form .type-switch > button")) as HTMLButtonElement[];
    await user.click(recordTypeButtons[1]);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await user.click(recordTypeButtons[0]);
    await expandRecordMoreInfo(user);
    expect(screen.getByAltText("已附凭证图片")).toBeTruthy();
  });

  it("goSub 跳转其他子页同样被拦截；确认放弃后正常导航且凭证状态清空", async () => {
    prepareAuthenticatedWorkspace();
    const user = userEvent.setup();
    renderHome();
    await uploadVoucher(user);

    // 商品销售入口（goSub 到订单表单）同样触发保护
    await user.click(screen.getByRole("button", { name: "商品销售" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "留在本页" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "记录一笔收支" })).toBeTruthy();

    // 返回被拦截后确认放弃：清空凭证状态并正常导航
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "放弃凭证并离开" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await screen.findByRole("navigation", { name: "主导航" });

    // 重新进入记一笔：凭证状态已清空，回到选择凭证图片
    await user.click(screen.getByRole("button", { name: "新增记一笔" }));
    await expandRecordMoreInfo(user);
    expect(screen.getByLabelText("上传凭证图片")).toBeTruthy();
    expect(screen.queryByAltText("已附凭证图片")).toBeNull();
  });

  it("保存记录成功后直接导航不再提示，凭证已随流水关联", async () => {
    prepareAuthenticatedWorkspace();
    const user = userEvent.setup();
    renderHome();
    await uploadVoucher(user);

    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "66.60");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "凭证保存后离开回归");
    await user.click(screen.getByRole("button", { name: "保存记录" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    const search = screen.getByPlaceholderText("搜索商户、备注或分类");
    await user.type(search, "凭证保存后离开回归");
    await user.click(screen.getByRole("button", { name: /凭证保存后离开回归/ }));
    expect(screen.getByText(/已附图片凭证/)).toBeTruthy();
  });

  it("保存并继续后凭证已随流水关联，返回不再提示", async () => {
    prepareAuthenticatedWorkspace();
    const user = userEvent.setup();
    renderHome();
    await uploadVoucher(user);

    await user.clear(screen.getByPlaceholderText("0.00"));
    await user.type(screen.getByPlaceholderText("0.00"), "88.80");
    await user.clear(screen.getByPlaceholderText("例如：平台服务商"));
    await user.type(screen.getByPlaceholderText("例如：平台服务商"), "凭证保存并继续回归");
    await user.click(screen.getByRole("button", { name: "保存并继续" }));

    expect(screen.getByText("已保存，可继续录入")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await screen.findByRole("navigation", { name: "主导航" });
  });

  it("用户手动移除凭证图片后返回不再提示", async () => {
    prepareAuthenticatedWorkspace();
    const user = userEvent.setup();
    renderHome();
    await uploadVoucher(user);

    await user.click(screen.getByRole("button", { name: "移除图片" }));
    expect(screen.queryByAltText("已附凭证图片")).toBeNull();
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await screen.findByRole("navigation", { name: "主导航" });
  });
});
