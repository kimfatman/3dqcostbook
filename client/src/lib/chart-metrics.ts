import type { Order, RefundCase, Sku } from "./order-ledger";

export type ProfitBridgeInput = { netRevenue: number; cogs: number; operatingExpense: number; operatingProfit: number };
export type CategoryAmount = { key: string; label: string; amount: number };
export type SkuRankingInput = { id: string; name: string; unit: string; soldQuantity: number; refundedQuantity: number; grossProfit: number; netRevenue: number };

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

function dateKey(value: string) {
  return value.slice(0, 10);
}

function offsetDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * 近 N 日成交动能：销售额按订单成交日的已冻结行金额聚合，订单数为成交笔数。
 * 退款不在此处冲减，避免把售后日误当成销售日；净营收仍由账本内核单独计算。
 */
export function buildDailySalesOrders(input: { orders: Pick<Order, "occurredAt" | "lines">[]; endDate: string; days: number }) {
  const safeDays = Math.max(1, Math.floor(input.days));
  const dates = Array.from({ length: safeDays }, (_, index) => offsetDate(input.endDate, index - safeDays + 1));
  const groups = new Map(dates.map((date) => [date, { date, sales: 0, orders: 0 }]));
  input.orders.forEach((order) => {
    const day = dateKey(order.occurredAt);
    const current = groups.get(day);
    if (!current) return;
    current.sales += order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceFen, 0) / 100;
    current.orders += 1;
  });
  return dates.map((date) => {
    const item = groups.get(date)!;
    return { ...item, sales: Number(item.sales.toFixed(2)) };
  });
}

export function buildSkuRankings(items: SkuRankingInput[], limit = 5) {
  const prepared = items.map((item) => ({ ...item, netQuantity: Math.max(0, item.soldQuantity - item.refundedQuantity) }));
  return {
    sales: [...prepared].filter((item) => item.netQuantity > 0).sort((a, b) => b.netQuantity - a.netQuantity || b.netRevenue - a.netRevenue).slice(0, limit),
    profit: [...prepared].filter((item) => item.netRevenue > 0).sort((a, b) => b.grossProfit - a.grossProfit || b.netRevenue - a.netRevenue).slice(0, limit),
  };
}

/** 当前期间 SKU 指标：成交按订单日入账，退款按退款日冲减当期净营收与已售成本。 */
export function buildPeriodSkuMetrics(input: { skus: Pick<Sku, "id" | "name" | "unit">[]; orders: Pick<Order, "occurredAt" | "lines">[]; refunds: Pick<RefundCase, "occurredAt" | "skuId" | "quantity" | "refundFen" | "recoveredCostFen">[]; period: string }) {
  const items = new Map(input.skus.map((sku) => [sku.id, { id: sku.id, name: sku.name, unit: sku.unit, soldQuantity: 0, refundedQuantity: 0, netRevenue: 0, netCogs: 0 }]));
  input.orders.filter((order) => order.occurredAt.startsWith(input.period)).forEach((order) => {
    order.lines.forEach((line) => {
      const sku = items.get(line.skuId);
      if (!sku) return;
      sku.soldQuantity += line.quantity;
      sku.netRevenue += line.quantity * line.unitPriceFen / 100;
      sku.netCogs += line.quantity * line.unitCostFen / 100;
    });
  });
  input.refunds.filter((refund) => refund.occurredAt.startsWith(input.period)).forEach((refund) => {
    const sku = items.get(refund.skuId);
    if (!sku) return;
    sku.refundedQuantity += refund.quantity;
    sku.netRevenue -= refund.refundFen / 100;
    sku.netCogs -= refund.recoveredCostFen / 100;
  });
  return Array.from(items.values()).map((item) => ({ ...item, netRevenue: Number(item.netRevenue.toFixed(2)), grossProfit: Number((item.netRevenue - item.netCogs).toFixed(2)) }));
}

export function buildCostStructure(items: CategoryAmount[], limit = 5) {
  const prepared = items.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = prepared.reduce((sum, item) => sum + item.amount, 0);
  return prepared.slice(0, limit).map((item) => ({ ...item, share: total > 0 ? Number((item.amount / total * 100).toFixed(1)) : 0 }));
}
