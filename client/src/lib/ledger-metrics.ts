/**
 * 账本内核：所有金额以分存储，所有页面指标只能经本文件派生。
 * 经营口径规范：净营收、销售成本、毛利与经营利润必须保持独立口径。
 */
export type LedgerRole = "revenue" | "other_income" | "cogs" | "opex" | "non_operating";
export type LedgerEventType = "sale" | "income" | "expense" | "customer_refund" | "inventory_return" | "adjustment";
export type CashDirection = "inflow" | "outflow" | "none";
export type EntryStatus = "draft" | "posted" | "voided";
export type BudgetBasis = "operating_cost" | "cash_outflow";

export type LedgerEntry = {
  id: string;
  workspaceId: string;
  industryId: string;
  templateVersion: number;
  occurredAt: string;
  eventType: LedgerEventType;
  ledgerRole: LedgerRole;
  cashDirection: CashDirection;
  amountFen: number;
  categoryKey: string;
  merchant: string;
  note: string;
  status: EntryStatus;
  hasAttachment: boolean;
  relatedEntryId?: string;
  orderId?: string;
  skuId?: string;
  refundReason?: string;
  returnRecoveryStatus?: string;
  supplierId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetConfig = { amountFen: number; basis: BudgetBasis };
export type CostCategory = { key: string; label: string };
export type CostCategoryTotal = CostCategory & { amount: number };
export type LedgerMetrics = {
  grossSalesFen: number;
  otherIncomeFen: number;
  refundsFen: number;
  netRevenueFen: number;
  cogsFen: number;
  operatingExpenseFen: number;
  grossProfitFen: number;
  operatingProfitFen: number;
  grossMarginRate: number;
  operatingMarginRate: number;
  cashOutflowFen: number;
  budgetBaseFen: number;
  budgetUsedRate: number;
  budgetRemainingFen: number;
};

const sum = (list: LedgerEntry[], predicate: (entry: LedgerEntry) => boolean) => list.filter(predicate).reduce((total, entry) => total + entry.amountFen, 0);
export const rate = (numerator: number, denominator: number) => denominator > 0 ? Number((numerator / denominator * 100).toFixed(1)) : 0;
export const toFen = (yuan: number) => {
  if (!Number.isFinite(yuan)) return 0;
  const sign = yuan < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(yuan) + 1e-9) * 100);
};
export const fromFen = (fen: number) => fen / 100;
export const periodOf = (date: string) => date.slice(0, 7);

export function buildMetrics(entries: LedgerEntry[], budget: BudgetConfig): LedgerMetrics {
  const posted = entries.filter((entry) => entry.status === "posted");
  const grossSalesFen = sum(posted, (entry) => entry.eventType === "sale" && entry.ledgerRole === "revenue");
  const otherIncomeFen = sum(posted, (entry) => entry.eventType === "income" && entry.ledgerRole === "other_income");
  const refundsFen = sum(posted, (entry) => entry.eventType === "customer_refund");
  const netRevenueFen = grossSalesFen + otherIncomeFen - refundsFen;
  const cogsFen = sum(posted, (entry) => entry.ledgerRole === "cogs");
  const operatingExpenseFen = sum(posted, (entry) => entry.ledgerRole === "opex");
  const grossProfitFen = netRevenueFen - cogsFen;
  const operatingProfitFen = grossProfitFen - operatingExpenseFen;
  const cashOutflowFen = sum(posted, (entry) => entry.cashDirection === "outflow");
  const budgetBaseFen = budget.basis === "cash_outflow" ? cashOutflowFen : cogsFen + operatingExpenseFen;
  return {
    grossSalesFen, otherIncomeFen, refundsFen, netRevenueFen, cogsFen, operatingExpenseFen,
    grossProfitFen, operatingProfitFen, grossMarginRate: rate(grossProfitFen, netRevenueFen),
    operatingMarginRate: rate(operatingProfitFen, netRevenueFen), cashOutflowFen, budgetBaseFen,
    budgetUsedRate: rate(budgetBaseFen, budget.amountFen), budgetRemainingFen: budget.amountFen - budgetBaseFen,
  };
}

/**
 * 将所有已入账销售成本和经营费用按当前可见分类归集。
 * 历史分类被删除、退款手续费等未配置分类不会被静默丢弃，而是统一进入“未分类成本”。
 */
export function buildCostCategoryTotals(entries: LedgerEntry[], categories: CostCategory[]): CostCategoryTotal[] {
  const amounts = new Map(categories.map((category) => [category.key, 0]));
  let unmappedFen = 0;
  entries.filter((entry) => entry.status === "posted" && (entry.ledgerRole === "cogs" || entry.ledgerRole === "opex")).forEach((entry) => {
    if (amounts.has(entry.categoryKey)) amounts.set(entry.categoryKey, (amounts.get(entry.categoryKey) || 0) + entry.amountFen);
    else unmappedFen += entry.amountFen;
  });
  const totals = categories.map((category) => ({ ...category, amount: fromFen(amounts.get(category.key) || 0) }));
  if (unmappedFen !== 0) totals.push({ key: "__unmapped__", label: "未分类成本", amount: fromFen(unmappedFen) });
  return totals.sort((left, right) => right.amount - left.amount);
}

export function entriesForPeriod(entries: LedgerEntry[], industryId: string, period: string) {
  return entries.filter((entry) => entry.industryId === industryId && entry.status === "posted" && periodOf(entry.occurredAt) === period);
}

export function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const point = new Date(Date.UTC(year, month - 2, 1));
  return `${point.getUTCFullYear()}-${String(point.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function periodSeries(entries: LedgerEntry[], industryId: string, selectedPeriod: string, count: number, budget: BudgetConfig) {
  const periods: string[] = [];
  let cursor = selectedPeriod;
  for (let index = 0; index < count; index += 1) { periods.unshift(cursor); cursor = previousPeriod(cursor); }
  return periods.map((period) => ({ period, metrics: buildMetrics(entriesForPeriod(entries, industryId, period), budget) }));
}
