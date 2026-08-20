import type { RefundCase } from "./order-ledger";

export type ProfitBridgeInput = { netRevenue: number; cogs: number; operatingExpense: number; operatingProfit: number };
export type CategoryAmount = { key: string; label: string; amount: number };

export function buildProfitBridge(input: ProfitBridgeInput) {
  return [
    { key: "revenue", label: "净营收", amount: input.netRevenue, role: "start" as const },
    { key: "cogs", label: "销售成本", amount: -input.cogs, role: "deduct" as const },
    { key: "opex", label: "经营费用", amount: -input.operatingExpense, role: "deduct" as const },
    { key: "profit", label: input.operatingProfit >= 0 ? "经营利润" : "经营亏损", amount: input.operatingProfit, role: "result" as const },
  ];
}

export function buildBudgetBurn(input: { budget: number; used: number; dayOfMonth: number; daysInMonth: number }) {
  const budget = Math.max(0, input.budget);
  const used = Math.max(0, input.used);
  const daysElapsed = Math.max(1, Math.min(input.dayOfMonth, input.daysInMonth));
  const dailyBurn = used / daysElapsed;
  const forecast = dailyBurn * input.daysInMonth;
  return {
    budget,
    used,
    remaining: budget - used,
    usedRate: budget > 0 ? Number((used / budget * 100).toFixed(1)) : 0,
    forecast: Number(forecast.toFixed(2)),
    forecastRate: budget > 0 ? Number((forecast / budget * 100).toFixed(1)) : 0,
    state: used > budget ? "over" as const : forecast > budget ? "risk" as const : "healthy" as const,
  };
}

export function buildCategoryDeltas(current: CategoryAmount[], previous: CategoryAmount[]) {
  const previousByKey = new Map(previous.map((item) => [item.key, item.amount]));
  return current.map((item) => {
    const previousAmount = previousByKey.get(item.key) || 0;
    const delta = item.amount - previousAmount;
    return {
      ...item,
      previousAmount,
      delta: Number(delta.toFixed(2)),
      deltaRate: previousAmount > 0 ? Number((delta / previousAmount * 100).toFixed(1)) : null,
    };
  }).sort((a, b) => b.amount - a.amount);
}

const refundReasonLabel: Record<RefundCase["reason"], string> = {
  quality_issue: "质量问题", wrong_item: "错发漏发", customer_cancelled: "客户取消", logistics_delay: "物流延误", duplicate_order: "重复下单", other: "其他",
};

export function buildRefundPareto(refunds: RefundCase[]) {
  const groups = new Map<RefundCase["reason"], { amount: number; quantity: number }>();
  refunds.forEach((refund) => {
    const current = groups.get(refund.reason) || { amount: 0, quantity: 0 };
    groups.set(refund.reason, { amount: current.amount + refund.refundFen / 100, quantity: current.quantity + refund.quantity });
  });
  const total = Array.from(groups.values()).reduce((sum, item) => sum + item.amount, 0);
  let cumulative = 0;
  return Array.from(groups.entries()).map(([reason, values]) => ({ reason, label: refundReasonLabel[reason], amount: Number(values.amount.toFixed(2)), quantity: values.quantity }))
    .sort((a, b) => b.amount - a.amount)
    .map((item) => {
      cumulative += item.amount;
      return { ...item, share: total > 0 ? Number((item.amount / total * 100).toFixed(1)) : 0, cumulativeShare: total > 0 ? Number((cumulative / total * 100).toFixed(1)) : 0 };
    });
}
