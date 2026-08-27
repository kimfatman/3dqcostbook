import { describe, expect, it } from "vitest";
import { calcCard, normalizeState, removeIndirectCostPoolState, seedPeriodFactor, setIndirectCostPoolAllocationModeState, updateIndirectCostPoolState, type CostCard } from "./cost-book";
import { businessPeriod } from "./business-date";
import type { IndirectCostPool } from "./indirect-costs";

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

  it("载入旧分类目录时为各行业补齐一次其他收入标签，供手工收入切换使用", () => {
    const state = normalizeState({ schemaVersion: 4, workspace: { id: "legacy", activeIndustryId: "ecommerce" }, categories: [{ id: "legacy-cost", workspaceId: "legacy", industryId: "ecommerce", key: "goods_purchase", label: "商品采购", color: "#1677FF", hint: "进货", ledgerRole: "cogs" }] });
    const incomeCategories = state.categories.filter((category) => category.industryId === "ecommerce" && category.ledgerRole === "other_income");

    expect(incomeCategories).toHaveLength(1);
    expect(incomeCategories[0]).toMatchObject({ key: "other_income", label: "其他收入" });
  });

  it("会为历史演示状态中被持久化为 null 的当前账期金额恢复可推导的种子金额", () => {
    const state = normalizeState({ schemaVersion: 3, workspace: { id: "demo", activeIndustryId: "ecommerce", dataMode: "demo" }, entries: [{ id: "seed-sale", workspaceId: "demo", industryId: "ecommerce", occurredAt: "2026-08-14", eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow", amountFen: null, categoryKey: "sales", merchant: "蓝鲸电商店日结", note: "演示销售日结", status: "posted", hasAttachment: true, createdAt: "2026-08-14T12:00:00.000Z", updatedAt: "2026-08-14T12:00:00.000Z" }] });
    expect(state.entries[0]?.amountFen).toBeGreaterThan(0);
  });

  it("保留新流水的私有凭证资产 ID，并让旧布尔凭证记录继续可读", () => {
    const entry = { id: "voucher-1", workspaceId: "legacy", industryId: "ecommerce", templateVersion: 4, occurredAt: "2026-08-14", eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: 12800, categoryKey: "ad_spend", merchant: "投放平台", note: "活动投放", status: "posted", hasAttachment: true, attachmentAssetId: "asset-1", createdAt: "2026-08-14T12:00:00.000Z", updatedAt: "2026-08-14T12:00:00.000Z" };
    const state = normalizeState({ schemaVersion: 4, workspace: { id: "legacy", activeIndustryId: "ecommerce" }, entries: [entry, { ...entry, id: "legacy-boolean", attachmentAssetId: 42 }] });

    expect(state.schemaVersion).toBe(6);
    expect(state.entries.find(item => item.id === "voucher-1")).toMatchObject({ hasAttachment: true, attachmentAssetId: "asset-1" });
    expect(state.entries.find(item => item.id === "legacy-boolean")).toMatchObject({ hasAttachment: true, attachmentAssetId: undefined });
  });

  it("历史成本卡缺少 SKU 时会补齐可下单关联，避免订单入口错误阻断", () => {
    const state = normalizeState({ schemaVersion: 3, workspace: { id: "legacy", activeIndustryId: "ecommerce" }, cards: [card], skus: [] });
    expect(state.skus).toHaveLength(1);
    expect(state.skus[0]).toMatchObject({ cardId: "card-1", name: "收纳盒", unitPriceFen: 6800, unitCostFen: 3290, active: true });
  });
});

describe("成本池状态级分摊", () => {
  const period = businessPeriod();
  const sourcePool: IndirectCostPool = { id: "pool-1", workspaceId: "workspace-main", industryId: "ecommerce", name: "本月房租", kind: "rent", amountFen: 9000, occurredAt: `${period}-01`, categoryKey: "other", source: "actual", allocationMode: "allocated", allocationMethod: "units", targets: [{ cardId: "card-1" }], sourceEntryId: "expense-1", createdAt: `${period}-01T00:00:00.000Z`, updatedAt: `${period}-01T00:00:00.000Z` };
  const stateWithPool = () => normalizeState({ schemaVersion: 4, workspace: { id: "workspace-main", activeIndustryId: "ecommerce" }, cards: [card], skus: [{ id: "sku-1", workspaceId: "workspace-main", industryId: "ecommerce", cardId: "card-1", code: "SKU-1", name: card.name, unit: "件", unitPriceFen: 6800, unitCostFen: 3290, active: true }], orders: [{ id: "order-1", industryId: "ecommerce", occurredAt: `${period}-10`, channel: "platform", lines: [{ id: "line-1", skuId: "sku-1", quantity: 10, unitPriceFen: 6800, unitCostFen: 3290 }] }], entries: [{ id: "expense-1", workspaceId: "workspace-main", industryId: "ecommerce", templateVersion: 4, occurredAt: `${period}-01`, eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: 9000, categoryKey: "other", merchant: "本月房租", note: "成本池：本月房租", status: "posted", hasAttachment: false, createdAt: `${period}-01T00:00:00.000Z`, updatedAt: `${period}-01T00:00:00.000Z` }], indirectCostPools: [sourcePool] });

  it("编辑金额、来源与规则会重算SKU，且不改写既有订单成本快照", () => {
    const state = stateWithPool();
    const result = updateIndirectCostPoolState(state, "pool-1", { name: "更新后的房租", kind: "rent", amount: 180, date: `${period}-02`, categoryKey: "other", source: "planned", allocationMode: "allocated", allocationMethod: "revenue", targets: [{ cardId: "card-1" }] }, `${period}-02T00:00:00.000Z`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.skus.find((sku) => sku.id === "sku-1")).toMatchObject({ unitCostFen: 3290, allocatedUnitCostFen: 1800 });
    expect(result.state.orders[0].lines[0].unitCostFen).toBe(3290);
    expect(result.state.entries.find((entry) => entry.id === "expense-1")).toBeUndefined();
    expect(result.state.indirectCostPools[0]).toMatchObject({ name: "更新后的房租", source: "planned", allocationMethod: "revenue", amountFen: 18000 });
  });

  it("暂不摊销、重新一键摊销和删除设置会刷新后续SKU，不触碰订单快照", () => {
    const state = stateWithPool();
    const disabled = setIndirectCostPoolAllocationModeState(state, "pool-1", "unallocated", `${period}-02T00:00:00.000Z`);
    expect(disabled.skus[0].unitCostFen).toBe(3290);
    const enabled = setIndirectCostPoolAllocationModeState({ ...disabled, indirectCostPools: disabled.indirectCostPools.map((pool) => ({ ...pool, targets: [] })) }, "pool-1", "allocated", `${period}-03T00:00:00.000Z`);
    expect(enabled.indirectCostPools[0].targets).toEqual([{ cardId: "card-1" }]);
    expect(enabled.indirectCostPools[0].allocationMethod).toBe("equal");
    expect(enabled.skus[0]).toMatchObject({ unitCostFen: 3290, allocatedUnitCostFen: 900 });
    const removed = removeIndirectCostPoolState(enabled, "pool-1");
    expect(removed.indirectCostPools).toEqual([]);
    expect(removed.skus[0]).toMatchObject({ unitCostFen: 3290, allocatedUnitCostFen: 0 });
    expect(removed.orders[0].lines[0].unitCostFen).toBe(3290);
  });
});
