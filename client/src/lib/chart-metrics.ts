import type { Order, RefundCase, Sku } from "./order-ledger";
import type { LedgerEntry } from "./ledger-metrics";

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

export type SupplierCostRanking = { supplierId: string; label: string; amount: number; share: number; entryCount: number };

/** 供应商排行只归集当前期间已入账、已关联供应商的正向成本分录；未关联数据不会被臆测归属。 */
export function buildSupplierCostRankings(input: { entries: Pick<LedgerEntry, "industryId" | "occurredAt" | "status" | "ledgerRole" | "amountFen" | "supplierId">[]; suppliers: { id: string; name: string }[]; industryId: string; period: string; limit?: number }): SupplierCostRanking[] {
  const supplierById = new Map(input.suppliers.map((supplier) => [supplier.id, supplier.name]));
  const grouped = new Map<string, { amountFen: number; entryCount: number }>();
  input.entries.filter((entry) => entry.industryId === input.industryId && entry.occurredAt.startsWith(input.period) && entry.status === "posted" && (entry.ledgerRole === "cogs" || entry.ledgerRole === "opex") && entry.amountFen > 0 && Boolean(entry.supplierId) && supplierById.has(entry.supplierId!)).forEach((entry) => {
    const supplierId = entry.supplierId!;
    const current = grouped.get(supplierId) || { amountFen: 0, entryCount: 0 };
    grouped.set(supplierId, { amountFen: current.amountFen + entry.amountFen, entryCount: current.entryCount + 1 });
  });
  const totalFen = Array.from(grouped.values()).reduce((sum, item) => sum + item.amountFen, 0);
  return Array.from(grouped.entries()).map(([supplierId, values]) => ({ supplierId, label: supplierById.get(supplierId)!, amount: Number((values.amountFen / 100).toFixed(2)), share: totalFen > 0 ? Number((values.amountFen / totalFen * 100).toFixed(1)) : 0, entryCount: values.entryCount })).sort((a, b) => b.amount - a.amount || b.entryCount - a.entryCount).slice(0, input.limit ?? 5);
}

export type CostStructureComparison = { key: string; label: string; amount: number; previousAmount: number; share: number; previousShare: number; delta: number; shareDelta: number };

/** 用本期和上期各自的正向成本作为分母，避免成本回冲或缺失分类制造伪占比变化。 */
export function buildCostStructureComparison(current: CategoryAmount[], previous: CategoryAmount[], limit = 5): CostStructureComparison[] {
  const currentItems = current.filter((item) => item.amount > 0);
  const previousItems = previous.filter((item) => item.amount > 0);
  const currentTotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
  const previousTotal = previousItems.reduce((sum, item) => sum + item.amount, 0);
  const previousByKey = new Map(previousItems.map((item) => [item.key, item]));
  const currentByKey = new Map(currentItems.map((item) => [item.key, item]));
  const keys = new Set([...Array.from(currentByKey.keys()), ...Array.from(previousByKey.keys())]);
  return Array.from(keys).map((key) => {
    const item = currentByKey.get(key);
    const prior = previousByKey.get(key);
    const amount = item?.amount || 0;
    const previousAmount = prior?.amount || 0;
    const share = currentTotal > 0 ? Number((amount / currentTotal * 100).toFixed(1)) : 0;
    const previousShare = previousTotal > 0 ? Number((previousAmount / previousTotal * 100).toFixed(1)) : 0;
    return { key, label: item?.label || prior?.label || key, amount, previousAmount, share, previousShare, delta: Number((amount - previousAmount).toFixed(2)), shareDelta: Number((share - previousShare).toFixed(1)) };
  }).sort((a, b) => b.amount - a.amount || b.previousAmount - a.previousAmount).slice(0, limit);
}

export type MonthlyCostStackCategory = { key: string; label: string };
export type MonthlyCostStackMonth = { period: string; total: number; values: Record<string, number> };

/**
 * 月度成本堆积：仅归集已入账的销售成本与经营费用。
 * 未映射到当前分类的历史成本被收口到“未分类成本”，从而保证每月分类之和严格等于账本总成本。
 */
export function buildMonthlyCostStack(input: { entries: LedgerEntry[]; industryId: string; categoryKeys: string[]; categoryLabels: Record<string, string>; periods: string[] }) {
  const baseCategories = input.categoryKeys.map((key) => ({ key, label: input.categoryLabels[key] || key }));
  const costEntries = input.entries.filter((entry) => entry.industryId === input.industryId && entry.status === "posted" && (entry.ledgerRole === "cogs" || entry.ledgerRole === "opex") && input.periods.includes(entry.occurredAt.slice(0, 7)));
  const hasUnmappedCost = costEntries.some((entry) => !input.categoryKeys.includes(entry.categoryKey));
  const categories = hasUnmappedCost ? [...baseCategories, { key: "__unmapped__", label: "未分类成本" }] : baseCategories;
  const months: MonthlyCostStackMonth[] = input.periods.map((period) => {
    const values = Object.fromEntries(categories.map((category) => [category.key, 0])) as Record<string, number>;
    costEntries.filter((entry) => entry.occurredAt.slice(0, 7) === period).forEach((entry) => {
      const key = input.categoryKeys.includes(entry.categoryKey) ? entry.categoryKey : "__unmapped__";
      values[key] = Number(((values[key] || 0) + entry.amountFen / 100).toFixed(2));
    });
    const total = Number(Object.values(values).reduce((sum, amount) => sum + amount, 0).toFixed(2));
    return { period, total, values };
  });
  const validMonths = months.filter((month) => month.total !== 0).length;
  return { categories, months, validMonths, canRender: validMonths >= 2 };
}

/** 现金流只认分录的现金方向，不借用利润表的收入、成本或费用分类。可选过滤仅作用于真实分录。 */
export function buildMonthlyCashFlow(input: { entries: LedgerEntry[]; industryId: string; periods: string[]; entryFilter?: (entry: LedgerEntry) => boolean }) {
  const months = input.periods.map((period) => {
    const values = input.entries.filter((entry) => entry.industryId === input.industryId && entry.status === "posted" && entry.occurredAt.slice(0, 7) === period && (!input.entryFilter || input.entryFilter(entry)));
    const inflow = values.filter((entry) => entry.cashDirection === "inflow").reduce((sum, entry) => sum + entry.amountFen, 0) / 100;
    const outflow = values.filter((entry) => entry.cashDirection === "outflow").reduce((sum, entry) => sum + entry.amountFen, 0) / 100;
    return { period, inflow: Number(inflow.toFixed(2)), outflow: Number(outflow.toFixed(2)) };
  });
  return { months, validMonths: months.filter((month) => month.inflow !== 0 || month.outflow !== 0).length, canRender: months.some((month) => month.inflow !== 0 || month.outflow !== 0) };
}

/** 月销售目标运行率：目标以分传入，收入以元传入，未设置目标时明确返回 null。 */
export function buildSalesTargetProgress(input: { revenue: number; targetFen: number; dayOfMonth: number; daysInMonth: number }) {
  const target = Math.max(0, input.targetFen) / 100;
  if (!target) return null;
  const daysInMonth = Math.max(1, Math.floor(input.daysInMonth));
  const dayOfMonth = Math.max(1, Math.min(Math.floor(input.dayOfMonth), daysInMonth));
  const revenue = Math.max(0, input.revenue);
  const projectedRevenue = Number((revenue / dayOfMonth * daysInMonth).toFixed(2));
  const completionRate = Number((revenue / target * 100).toFixed(1));
  const projectedRate = Number((projectedRevenue / target * 100).toFixed(1));
  const remaining = Math.max(0, Number((target - revenue).toFixed(2)));
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
  const requiredDaily = remainingDays > 0 ? Number((remaining / remainingDays).toFixed(2)) : remaining;
  return { target, revenue, completionRate, projectedRevenue, projectedRate, remaining, requiredDaily, state: revenue >= target ? "reached" as const : projectedRevenue >= target ? "on_track" as const : "behind" as const };
}
