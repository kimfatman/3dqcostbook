import { describe, expect, it } from "vitest";
import { calcCard, normalizeState, seedPeriodFactor, type CostCard } from "./cost-book";

const card: CostCard = {
  id: "card-1",
  workspaceId: "w",
  industryId: "ecommerce",
  name: "收纳盒",
  kind: "平台 SKU",
  unit: "件",
  salePrice: 68,
  labor: 3.2,
  overhead: 4.1,
  items: [{ id: "bom-1", name: "货品采购", spec: "单件", quantity: "1 件", amount: 20 }, { id: "bom-2", name: "包材", spec: "单件", quantity: "1 件", amount: 5.6 }],
  history: [],
  status: "healthy",
};

describe("成本卡单位成本与毛利", () => {
  it("新增成本卡会以物料、人工和固定分摊共同计算单位成本", () => {
    expect(calcCard(card)).toEqual({ material: 25.6, cost: 32.9, marginRate: 51.6 });
  });

  it("编辑 BOM 或分摊后可重算后续 SKU 所需的单位成本", () => {
    const edited = { ...card, labor: 4.2, items: card.items.map((item) => item.id === "bom-2" ? { ...item, amount: 7.8 } : item) };
    expect(calcCard(edited)).toEqual({ material: 27.8, cost: 36.1, marginRate: 46.9 });
  });

  it("多项材料会在同一张成本卡内累计，不会覆盖此前已录入的材料", () => {
    const withThirdMaterial = { ...card, items: [...card.items, { id: "bom-3", name: "封口贴", spec: "单件", quantity: "1 张", amount: 1.8 }] };
    expect(calcCard(withThirdMaterial)).toEqual({ material: 27.4, cost: 34.7, marginRate: 49 });
  });
});

describe("种子账本期间系数", () => {
  it("在新增账期超过预置系数长度时沿用最近一期有效系数，避免产生 NaN 金额", () => {
    expect(seedPeriodFactor(0)).toBe(0.82);
    expect(seedPeriodFactor(5)).toBe(1);
    expect(seedPeriodFactor(6)).toBe(1);
    expect(Number.isFinite(seedPeriodFactor(99))).toBe(true);
  });
});

describe("历史本地状态兼容", () => {
  it("缺少集合字段的已保存状态会补齐为空集合或默认分类，避免首页初始化失败", () => {
    const state = normalizeState({ schemaVersion: 3, workspace: { id: "legacy", activeIndustryId: "ecommerce" } });
    expect(state.entries).toEqual([]);
    expect(state.cards).toEqual([]);
    expect(state.skus).toEqual([]);
    expect(state.orders).toEqual([]);
    expect(state.refunds).toEqual([]);
    expect(state.suppliers).toEqual([]);
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.workspace.salesTargets.ecommerce).toBe(0);
  });

  it("会为历史演示状态中被持久化为 null 的当前账期金额恢复可推导的种子金额", () => {
    const state = normalizeState({ schemaVersion: 3, workspace: { id: "demo", activeIndustryId: "ecommerce", dataMode: "demo" }, entries: [{ id: "seed-sale", workspaceId: "demo", industryId: "ecommerce", occurredAt: "2026-08-14", eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow", amountFen: null, categoryKey: "sales", merchant: "蓝鲸电商店日结", note: "演示销售日结", status: "posted", hasAttachment: true, createdAt: "2026-08-14T12:00:00.000Z", updatedAt: "2026-08-14T12:00:00.000Z" }] });
    expect(state.entries[0]?.amountFen).toBeGreaterThan(0);
  });

  it("历史成本卡缺少 SKU 时会补齐可下单关联，避免订单入口错误阻断", () => {
    const state = normalizeState({ schemaVersion: 3, workspace: { id: "legacy", activeIndustryId: "ecommerce" }, cards: [card], skus: [] });
    expect(state.skus).toHaveLength(1);
    expect(state.skus[0]).toMatchObject({ cardId: "card-1", name: "收纳盒", unitPriceFen: 6800, unitCostFen: 3290, active: true });
  });
});
