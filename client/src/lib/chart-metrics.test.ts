import { describe, expect, it } from "vitest";
import { buildBudgetBurn, buildCategoryDeltas, buildProfitBridge, buildRefundPareto } from "./chart-metrics";

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
});
