import { describe, expect, it } from "vitest";
import { buildBudgetBurn, buildCategoryDeltas, buildCostStructure, buildDailySalesOrders, buildMonthlyCashFlow, buildMonthlyCostStack, buildPeriodSkuMetrics, buildProfitBridge, buildRefundPareto, buildSalesTargetProgress, buildSkuRankings } from "./chart-metrics";

describe("经营图表指标", () => {
  it("利润桥保持净营收、成本、费用与经营利润的统一口径", () => {
    const bridge = buildProfitBridge({ netRevenue: 1000, cogs: 420, operatingExpense: 180, operatingProfit: 400 });
    expect(bridge.map((item) => item.amount)).toEqual([1000, -420, -180, 400]);
    expect(bridge.at(-1)?.label).toBe("经营利润");
  });

  it("预算燃尽依据已用金额和已过天数预测，而非虚构趋势", () => {
    const burn = buildBudgetBurn({ budget: 3000, used: 1400, dayOfMonth: 14, daysInMonth: 28 });
    expect(burn.usedRate).toBe(46.7);
    expect(burn.forecast).toBe(2800);
    expect(burn.state).toBe("healthy");
  });

  it("成本环比以同一分类的真实上期金额为基准", () => {
    const items = buildCategoryDeltas([{ key: "ad", label: "广告", amount: 600 }, { key: "goods", label: "采购", amount: 1000 }], [{ key: "ad", label: "广告", amount: 400 }, { key: "goods", label: "采购", amount: 1100 }]);
    expect(items.find((item) => item.key === "ad")).toMatchObject({ delta: 200, deltaRate: 50 });
    expect(items.find((item) => item.key === "goods")).toMatchObject({ delta: -100, deltaRate: -9.1 });
  });

  it("退款帕累托按退款金额排序并计算累计占比", () => {
    const refunds = [
      { reason: "quality_issue", refundFen: 12000, quantity: 1 },
      { reason: "wrong_item", refundFen: 3000, quantity: 2 },
      { reason: "quality_issue", refundFen: 5000, quantity: 1 },
    ] as never[];
    const pareto = buildRefundPareto(refunds);
    expect(pareto[0]).toMatchObject({ label: "质量问题", amount: 170, quantity: 2, cumulativeShare: 85 });
    expect(pareto[1]).toMatchObject({ label: "错发漏发", share: 15, cumulativeShare: 100 });
  });

  it("销售动能按订单成交日聚合销售额与订单数，不把退款日当成销售日", () => {
    const orders = [
      { occurredAt: "2026-07-12", lines: [{ quantity: 2, unitPriceFen: 1000 }] },
      { occurredAt: "2026-07-14", lines: [{ quantity: 1, unitPriceFen: 3200 }, { quantity: 3, unitPriceFen: 500 }] },
    ] as never[];
    const series = buildDailySalesOrders({ orders, endDate: "2026-07-14", days: 3 });
    expect(series).toEqual([
      { date: "2026-07-12", sales: 20, orders: 1 },
      { date: "2026-07-13", sales: 0, orders: 0 },
      { date: "2026-07-14", sales: 47, orders: 1 },
    ]);
  });

  it("SKU 排行按净销量和真实毛利分别排序，并扣除退款数量", () => {
    const ranks = buildSkuRankings([
      { id: "a", name: "A", unit: "件", soldQuantity: 12, refundedQuantity: 3, grossProfit: 240, netRevenue: 900 },
      { id: "b", name: "B", unit: "件", soldQuantity: 8, refundedQuantity: 0, grossProfit: 360, netRevenue: 800 },
      { id: "c", name: "C", unit: "件", soldQuantity: 20, refundedQuantity: 20, grossProfit: -50, netRevenue: 0 },
    ]);
    expect(ranks.sales.map((item) => [item.name, item.netQuantity])).toEqual([["A", 9], ["B", 8]]);
    expect(ranks.profit.map((item) => item.name)).toEqual(["B", "A"]);
  });

  it("当前期间 SKU 指标按订单日入销售，按退款日冲减当期净营收和已售成本", () => {
    const metrics = buildPeriodSkuMetrics({
      skus: [{ id: "a", name: "商品 A", unit: "件" }],
      orders: [{ occurredAt: "2026-07-10", lines: [{ skuId: "a", quantity: 3, unitPriceFen: 1000, unitCostFen: 400 }] }, { occurredAt: "2026-06-30", lines: [{ skuId: "a", quantity: 9, unitPriceFen: 1000, unitCostFen: 400 }] }],
      refunds: [{ occurredAt: "2026-07-12", skuId: "a", quantity: 1, refundFen: 1000, recoveredCostFen: 400 }],
      period: "2026-07",
    } as never);
    expect(metrics[0]).toMatchObject({ soldQuantity: 3, refundedQuantity: 1, netRevenue: 20, grossProfit: 12 });
  });

  it("成本结构按真实成本金额排序并以全部成本作为占比基数", () => {
    const structure = buildCostStructure([{ key: "ad", label: "广告", amount: 250 }, { key: "goods", label: "采购", amount: 500 }, { key: "rent", label: "租金", amount: 250 }]);
    expect(structure.map((item) => [item.label, item.share])).toEqual([["采购", 50], ["广告", 25], ["租金", 25]]);
  });

  it("月成本堆积按分类归集已入账成本，并保持分类合计等于每月总成本", () => {
    const entries = [
      { industryId: "ecommerce", occurredAt: "2026-06-05", status: "posted", ledgerRole: "cogs", categoryKey: "goods", amountFen: 30000 },
      { industryId: "ecommerce", occurredAt: "2026-06-06", status: "posted", ledgerRole: "opex", categoryKey: "ad", amountFen: 12000 },
      { industryId: "ecommerce", occurredAt: "2026-07-06", status: "posted", ledgerRole: "cogs", categoryKey: "goods", amountFen: 50000 },
      { industryId: "ecommerce", occurredAt: "2026-07-07", status: "draft", ledgerRole: "opex", categoryKey: "ad", amountFen: 99900 },
      { industryId: "retail", occurredAt: "2026-07-06", status: "posted", ledgerRole: "opex", categoryKey: "ad", amountFen: 88800 },
    ] as never[];
    const stack = buildMonthlyCostStack({ entries, industryId: "ecommerce", categoryKeys: ["goods", "ad"], categoryLabels: { goods: "商品采购", ad: "广告投放" }, periods: ["2026-06", "2026-07"] });
    expect(stack.canRender).toBe(true);
    expect(stack.months.map((month) => [month.total, Object.values(month.values).reduce((sum, amount) => sum + amount, 0)])).toEqual([[420, 420], [500, 500]]);
  });

  it("现金流只使用 cashDirection，不把利润角色或无现金方向混入流入流出", () => {
    const entries = [
      { industryId: "ecommerce", occurredAt: "2026-07-01", status: "posted", ledgerRole: "revenue", cashDirection: "inflow", amountFen: 100000 },
      { industryId: "ecommerce", occurredAt: "2026-07-02", status: "posted", ledgerRole: "revenue", cashDirection: "outflow", amountFen: 15000 },
      { industryId: "ecommerce", occurredAt: "2026-07-03", status: "posted", ledgerRole: "cogs", cashDirection: "none", amountFen: 60000 },
      { industryId: "ecommerce", occurredAt: "2026-07-04", status: "draft", ledgerRole: "opex", cashDirection: "outflow", amountFen: 80000 },
    ] as never[];
    const cash = buildMonthlyCashFlow({ entries, industryId: "ecommerce", periods: ["2026-06", "2026-07"] });
    expect(cash.months).toEqual([{ period: "2026-06", inflow: 0, outflow: 0 }, { period: "2026-07", inflow: 1000, outflow: 150 }]);
  });

  it("销售目标未设置时不生成完成率，设置后按实际日均预测月末销售", () => {
    expect(buildSalesTargetProgress({ revenue: 3000, targetFen: 0, dayOfMonth: 10, daysInMonth: 30 })).toBeNull();
    expect(buildSalesTargetProgress({ revenue: 3000, targetFen: 900000, dayOfMonth: 10, daysInMonth: 30 })).toMatchObject({ completionRate: 33.3, projectedRevenue: 9000, projectedRate: 100, state: "on_track" });
  });
});
