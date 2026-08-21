import { describe, expect, it } from "vitest";
import { buildBusinessHealth, buildSalesTargetHistory } from "./health-metrics";

describe("经营健康度与销售目标历史", () => {
  it("只汇总有目标和账本证据的健康度维度，缺口不被计入总分", () => {
    const health = buildBusinessHealth({ revenue: 1400, grossSales: 1500, refunds: 100, operatingMarginRate: 18, totalCost: 500, budget: 1500, dayOfMonth: 14, daysInMonth: 28, salesTargetFen: 280000, targetOperatingMarginPct: 20, refundTolerancePct: 10, cashInflow: 800, cashOutflow: 400, orderCount: 2, lowProfitOrderCount: 1, costEntryCount: 2 });
    expect(health.dimensions.map((item) => [item.key, item.score])).toEqual([["sales", 100], ["profit", 90], ["cost", 100], ["cash", 100], ["after_sales", 38.3]]);
    expect(health.score).toBe(85.7);
    const missing = buildBusinessHealth({ revenue: 0, grossSales: 0, refunds: 0, operatingMarginRate: 0, totalCost: 0, budget: 0, dayOfMonth: 1, daysInMonth: 31, salesTargetFen: 0, targetOperatingMarginPct: 0, refundTolerancePct: 0, cashInflow: 0, cashOutflow: 0, orderCount: 0, lowProfitOrderCount: 0, costEntryCount: 0 });
    expect(missing.score).toBeNull();
    expect(missing.dimensions.every((item) => item.score === null && item.missing)).toBe(true);
  });

  it("销售目标历史只在可比目标和流水存在时计算环比与同比", () => {
    const history = buildSalesTargetHistory({ period: "2026-07", archives: [{ period: "2026-07", targetFen: 120000 }, { period: "2026-06", targetFen: 100000 }, { period: "2025-07", targetFen: 80000 }], revenueByPeriod: { "2026-07": 1000, "2026-06": 800, "2025-07": 500 } });
    expect(history).toMatchObject({ completionRate: 83.3, mom: { target: 20, revenue: 25 }, yoy: { target: 50, revenue: 100 } });
    expect(buildSalesTargetHistory({ period: "2026-08", archives: [], revenueByPeriod: {} }).mom.hasTargetBase).toBe(false);
  });
});
