import { describe, expect, it } from "vitest";
import { buildCostCategoryTotals, buildMetrics, entriesForPeriod, periodSeries, toFen, type LedgerEntry } from "./ledger-metrics";

const entry = (partial: Partial<LedgerEntry>): LedgerEntry => ({
  id: partial.id || crypto.randomUUID(), workspaceId: "w", industryId: "ecommerce", templateVersion: 2,
  occurredAt: "2026-07-14", eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow",
  amountFen: 0, categoryKey: "sales", merchant: "测试", note: "", status: "posted", hasAttachment: false,
  createdAt: "2026-07-14T00:00:00Z", updatedAt: "2026-07-14T00:00:00Z", ...partial,
});

describe("账本 P0 指标不变量", () => {
  it("只由销售交易确认收入，不依赖模板基准营收", () => {
    const metrics = buildMetrics([entry({ amountFen: toFen(100) })], { amountFen: toFen(200), basis: "operating_cost" });
    expect(metrics.netRevenueFen).toBe(toFen(100));
    expect(metrics.grossSalesFen).toBe(toFen(100));
  });

  it("客户退款冲减净营收，不把退款主分录计入销售成本或经营费用", () => {
    const entries = [entry({ id: "sale", amountFen: toFen(100) }), entry({ id: "cogs", eventType: "expense", ledgerRole: "cogs", cashDirection: "outflow", amountFen: toFen(40) }), entry({ id: "refund", eventType: "customer_refund", ledgerRole: "revenue", cashDirection: "outflow", amountFen: toFen(10) })];
    const metrics = buildMetrics(entries, { amountFen: toFen(100), basis: "operating_cost" });
    expect(metrics.netRevenueFen).toBe(toFen(90));
    expect(metrics.cogsFen).toBe(toFen(40));
    expect(metrics.grossMarginRate).toBe(55.6);
    expect(metrics.cashOutflowFen).toBe(toFen(50));
  });

  it("毛利率与经营利润率采用不同分子", () => {
    const entries = [entry({ amountFen: toFen(1000) }), entry({ id: "cogs", eventType: "expense", ledgerRole: "cogs", cashDirection: "outflow", amountFen: toFen(450) }), entry({ id: "opex", eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: toFen(350) })];
    const metrics = buildMetrics(entries, { amountFen: toFen(1000), basis: "operating_cost" });
    expect(metrics.grossMarginRate).toBe(55);
    expect(metrics.operatingMarginRate).toBe(20);
  });

  it("期间查询不会将七月数据缩放后伪装成六月数据", () => {
    const entries = [entry({ id: "jun", occurredAt: "2026-06-18", amountFen: toFen(80) }), entry({ id: "jul", occurredAt: "2026-07-18", amountFen: toFen(100) })];
    expect(entriesForPeriod(entries, "ecommerce", "2026-06").map((item) => item.id)).toEqual(["jun"]);
    const series = periodSeries(entries, "ecommerce", "2026-07", 2, { amountFen: toFen(1000), basis: "operating_cost" });
    expect(series.map((item) => item.metrics.netRevenueFen)).toEqual([toFen(80), toFen(100)]);
  });

  it("预算超支保留原始占用率，不封顶为 100%", () => {
    const metrics = buildMetrics([entry({ eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: toFen(130) })], { amountFen: toFen(100), basis: "operating_cost" });
    expect(metrics.budgetUsedRate).toBe(130);
    expect(metrics.budgetRemainingFen).toBe(toFen(-30));
  });

  it("金额转换在浮点半分边界稳定保留为最小货币单位", () => {
    expect(toFen(1.005)).toBe(101);
    expect(toFen(-1.005)).toBe(-101);
  });

  it("未配置分类的已入账成本不会从成本结构和报表快照中消失", () => {
    const entries = [
      entry({ id: "goods", eventType: "expense", ledgerRole: "cogs", amountFen: toFen(100), categoryKey: "goods" }),
      entry({ id: "refund-fee", eventType: "expense", ledgerRole: "opex", amountFen: toFen(12.5), categoryKey: "returns" }),
      entry({ id: "recovery", eventType: "inventory_return", ledgerRole: "cogs", amountFen: toFen(-30), categoryKey: "returns" }),
    ];
    expect(buildCostCategoryTotals(entries, [{ key: "goods", label: "商品采购" }])).toEqual([
      { key: "goods", label: "商品采购", amount: 100 },
      { key: "__unmapped__", label: "未分类成本", amount: -17.5 },
    ]);
  });
});
