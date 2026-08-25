export type HiddenCostRule = {
  key: string;
  label: string;
  rate: number;
  basisKeys: string[];
  tip: string;
};

export type HiddenCostBasis = { key: string; amount: number };

/**
 * 隐形成本是基于已入账收入或成本的行业基准估算，不应计入正式利润或成本。
 * 页面须同时展示估算来源与核对动作，避免将其误读为已发生的账务金额。
 */
export function buildHiddenCostEstimates(input: { rules: HiddenCostRule[]; revenue: number; categoryAmounts: HiddenCostBasis[] }) {
  const categoryAmountByKey = new Map(input.categoryAmounts.map((item) => [item.key, Math.max(0, item.amount)]));
  const revenue = Math.max(0, input.revenue);
  return input.rules.map((rule) => {
    const base = Number(rule.basisKeys.reduce((sum, key) => sum + (key === "revenue" ? revenue : categoryAmountByKey.get(key) || 0), 0).toFixed(2));
    const estimate = Number((base * Math.max(0, rule.rate)).toFixed(2));
    const health = estimate / Math.max(revenue, 1) < .04 ? 85 : estimate / Math.max(revenue, 1) < .08 ? 72 : 54;
    return { ...rule, base, estimate, health, source: "benchmark" as const };
  });
}
