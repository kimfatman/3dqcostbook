/**
 * 经营健康度评分：只汇总可验证维度，所有缺失目标或证据均单独披露且不计入总分。
 */
export type HealthDimensionKey = "sales" | "profit" | "cost" | "cash" | "after_sales";
export type HealthDimension = { key: HealthDimensionKey; label: string; score: number | null; raw: string; formula: string; missing?: string };

const clamp = (value: number) => Math.max(0, Math.min(100, Number(value.toFixed(1))));

export function buildBusinessHealth(input: {
  revenue: number; grossSales: number; refunds: number; operatingMarginRate: number; totalCost: number; budget: number;
  dayOfMonth: number; daysInMonth: number; salesTargetFen: number; targetOperatingMarginPct: number; refundTolerancePct: number;
  cashInflow: number; cashOutflow: number; orderCount: number; lowProfitOrderCount: number; costEntryCount: number;
}) {
  const days = Math.max(1, Math.min(input.dayOfMonth, input.daysInMonth));
  const target = Math.max(0, input.salesTargetFen) / 100;
  const expectedSales = target * days / Math.max(1, input.daysInMonth);
  const expectedCost = Math.max(0, input.budget) * days / Math.max(1, input.daysInMonth);
  const refundRate = input.grossSales > 0 ? input.refunds / input.grossSales * 100 : null;
  const lowProfitRate = input.orderCount > 0 ? input.lowProfitOrderCount / input.orderCount * 100 : null;
  const dimensions: HealthDimension[] = [
    target > 0 ? { key: "sales", label: "销售进度", score: clamp(input.revenue / Math.max(expectedSales, 1) * 100), raw: `实际 ¥${Math.round(input.revenue)} / 应达 ¥${Math.round(expectedSales)}`, formula: "实际净销售 ÷ 截至今日应达目标" } : { key: "sales", label: "销售进度", score: null, raw: `实际净销售 ¥${Math.round(input.revenue)}`, formula: "实际净销售 ÷ 截至今日应达目标", missing: "未设置本月销售目标" },
    input.targetOperatingMarginPct > 0 && input.revenue > 0 ? { key: "profit", label: "利润质量", score: clamp(input.operatingMarginRate / input.targetOperatingMarginPct * 100), raw: `实际 ${input.operatingMarginRate}% / 目标 ${input.targetOperatingMarginPct}%`, formula: "实际经营利润率 ÷ 目标经营利润率" } : { key: "profit", label: "利润质量", score: null, raw: input.revenue > 0 ? `实际经营利润率 ${input.operatingMarginRate}%` : "当前无净销售", formula: "实际经营利润率 ÷ 目标经营利润率", missing: input.targetOperatingMarginPct > 0 ? "缺少可计算的净销售" : "未设置目标经营利润率" },
    input.budget > 0 && input.costEntryCount > 0 ? { key: "cost", label: "成本控制", score: input.totalCost <= 0 ? 100 : clamp(expectedCost / input.totalCost * 100), raw: `成本 ¥${Math.round(input.totalCost)} / 应用 ¥${Math.round(expectedCost)}`, formula: "截至今日应占预算 ÷ 实际成本" } : { key: "cost", label: "成本控制", score: null, raw: input.budget > 0 ? "当前无成本分录" : "未设置月度预算", formula: "截至今日应占预算 ÷ 实际成本", missing: input.budget > 0 ? "至少需要一笔已入账成本" : "未设置月度预算" },
    input.cashInflow !== 0 || input.cashOutflow !== 0 ? { key: "cash", label: "现金覆盖", score: input.cashOutflow <= 0 ? 100 : clamp(input.cashInflow / input.cashOutflow * 100), raw: `流入 ¥${Math.round(input.cashInflow)} / 流出 ¥${Math.round(input.cashOutflow)}`, formula: "现金流入 ÷ 现金流出" } : { key: "cash", label: "现金覆盖", score: null, raw: "当前无现金方向分录", formula: "现金流入 ÷ 现金流出", missing: "至少需要一笔标记流入或流出的分录" },
    input.refundTolerancePct > 0 && refundRate !== null && lowProfitRate !== null ? { key: "after_sales", label: "售后质量", score: clamp((Math.max(0, 100 - refundRate / input.refundTolerancePct * 100) * .7) + (Math.max(0, 100 - lowProfitRate) * .3)), raw: `退款 ${refundRate.toFixed(1)}% / 低利润订单 ${lowProfitRate.toFixed(1)}%`, formula: "退款容忍得分 70% ＋ 非低利润订单占比 30%" } : { key: "after_sales", label: "售后质量", score: null, raw: refundRate === null ? "当前无销售额" : input.orderCount === 0 ? `退款率 ${refundRate.toFixed(1)}%` : "未设置退款容忍率", formula: "退款容忍得分 70% ＋ 非低利润订单占比 30%", missing: input.refundTolerancePct <= 0 ? "未设置退款容忍率" : input.orderCount === 0 ? "缺少订单覆盖数据" : "缺少销售额" },
  ];
  const scored = dimensions.filter((dimension) => dimension.score !== null);
  return { dimensions, score: scored.length ? Number((scored.reduce((sum, dimension) => sum + (dimension.score || 0), 0) / scored.length).toFixed(1)) : null, scoredCount: scored.length, totalDimensions: dimensions.length, expectedSales: Number(expectedSales.toFixed(2)), expectedCost: Number(expectedCost.toFixed(2)) };
}

const priorPeriod = (period: string, months: number) => { const [year, month] = period.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1 - months, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; };
const rate = (current: number | null, previous: number | null) => current !== null && previous !== null && previous !== 0 ? Number(((current - previous) / previous * 100).toFixed(1)) : null;

export function buildSalesTargetHistory(input: { period: string; archives: { period: string; targetFen: number }[]; revenueByPeriod: Record<string, number> }) {
  const targetByPeriod = new Map(input.archives.map((archive) => [archive.period, archive.targetFen / 100]));
  const selectedTarget = targetByPeriod.get(input.period) ?? null;
  const hasRevenue = Object.prototype.hasOwnProperty.call(input.revenueByPeriod, input.period);
  const revenue = hasRevenue ? input.revenueByPeriod[input.period] : null;
  const previous = priorPeriod(input.period, 1);
  const yearAgo = priorPeriod(input.period, 12);
  const previousTarget = targetByPeriod.get(previous) ?? null;
  const previousRevenue = Object.prototype.hasOwnProperty.call(input.revenueByPeriod, previous) ? input.revenueByPeriod[previous] : null;
  const yearAgoTarget = targetByPeriod.get(yearAgo) ?? null;
  const yearAgoRevenue = Object.prototype.hasOwnProperty.call(input.revenueByPeriod, yearAgo) ? input.revenueByPeriod[yearAgo] : null;
  return { period: input.period, target: selectedTarget, revenue, completionRate: selectedTarget && revenue !== null ? Number((revenue / selectedTarget * 100).toFixed(1)) : null, previousPeriod: previous, yearAgoPeriod: yearAgo, mom: { target: rate(selectedTarget, previousTarget), revenue: rate(revenue, previousRevenue), hasTargetBase: previousTarget !== null, hasRevenueBase: previousRevenue !== null }, yoy: { target: rate(selectedTarget, yearAgoTarget), revenue: rate(revenue, yearAgoRevenue), hasTargetBase: yearAgoTarget !== null, hasRevenueBase: yearAgoRevenue !== null } };
}
