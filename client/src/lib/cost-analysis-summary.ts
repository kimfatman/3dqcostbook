export type CostAnalysisCategory = {
  key: string;
  label: string;
  amount: number;
  previousAmount: number;
  delta: number;
  deltaRate: number | null;
};

export type CostAnalysisPriority = {
  key: string;
  label: string;
  amount: number;
  share: number;
  delta: number;
  deltaRate: number | null;
  reason: "increase" | "largest";
};

const money = (value: number) => Number(value.toFixed(2));
const ratio = (numerator: number, denominator: number) => denominator > 0 ? Number((numerator / denominator * 100).toFixed(1)) : 0;

/**
 * 成本分析首屏只回答三件事：花了多少、哪项占比最高、此刻最该先处理什么。
 * 明细和趋势仍可按需展开或下钻，避免把用户带入多个无优先级的图表与筛选器。
 */
export function buildCostAnalysisSummary(categories: CostAnalysisCategory[]) {
  const visible = categories.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const totalCost = money(categories.reduce((sum, item) => sum + item.amount, 0));
  const previousCost = money(categories.reduce((sum, item) => sum + item.previousAmount, 0));
  const grossCost = money(visible.reduce((sum, item) => sum + item.amount, 0));
  const costCredits = money(categories.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0));
  const delta = money(totalCost - previousCost);
  const deltaRate = previousCost > 0 ? ratio(delta, previousCost) : null;
  const ranked = visible.map((item) => ({ ...item, share: ratio(item.amount, grossCost) }));
  const structure = ranked.slice(0, 5);
  const fastestIncrease = [...ranked].filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta)[0];
  const top = ranked[0];
  const source = fastestIncrease || top;
  const priority: CostAnalysisPriority | null = source ? {
    ...source,
    reason: fastestIncrease ? "increase" : "largest",
  } : null;

  return {
    totalCost,
    previousCost,
    grossCost,
    costCredits,
    delta,
    deltaRate,
    structure,
    priority,
  };
}
