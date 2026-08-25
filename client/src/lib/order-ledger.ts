/**
 * 订单与 SKU 账本模型。
 * 订单确认销售收入和已售成本；退款冲减净营收；仅“可售回收入库”冲回已售成本。
 */
import { fromFen, toFen, type LedgerEntry } from "./ledger-metrics";

export type OrderChannel = "platform" | "live" | "store" | "private" | "other";
export type OrderStatus = "paid" | "partially_refunded" | "refunded";
export type ChannelPricingSnapshot = { commissionRatePct: number; fulfillmentCost: number; targetContributionMarginPct: number };
export type RefundReason = "quality_issue" | "wrong_item" | "customer_cancelled" | "logistics_delay" | "duplicate_order" | "other";
export type ReturnRecoveryStatus = "not_returned" | "in_transit" | "sellable_restocked" | "damaged_disposed";

export type Sku = {
  id: string;
  workspaceId: string;
  industryId: string;
  cardId?: string;
  code: string;
  name: string;
  unit: string;
  unitPriceFen: number;
  unitCostFen: number;
  active: boolean;
};

export type OrderLine = {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  unit: string;
  quantity: number;
  refundedQuantity: number;
  unitPriceFen: number;
  unitCostFen: number;
};

export type Order = {
  id: string;
  workspaceId: string;
  industryId: string;
  orderNo: string;
  channel: OrderChannel;
  buyer: string;
  occurredAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  pricing: ChannelPricingSnapshot;
  saleEntryId: string;
  createdAt: string;
  updatedAt: string;
};

export type RefundCase = {
  id: string;
  workspaceId: string;
  industryId: string;
  orderId: string;
  orderLineId: string;
  skuId: string;
  quantity: number;
  refundFen: number;
  refundFeeFen: number;
  reason: RefundReason;
  recoveryStatus: ReturnRecoveryStatus;
  recoveredCostFen: number;
  occurredAt: string;
  refundEntryId: string;
  createdAt: string;
};

export type OrderPricingAlert = { id: string; orderId: string; orderNo: string; channel: OrderChannel; type: "below_break_even" | "below_target_margin"; revenue: number; cogs: number; commission: number; fulfillment: number; contribution: number; contributionMarginRate: number; breakEvenRevenue: number; targetMarginRate: number };
export type OrderAfterSalesMetrics = { grossSalesFen: number; refundFen: number; netRevenueFen: number; grossCogsFen: number; recoveredCostFen: number; netCogsFen: number; refundFeeFen: number; estimatedCommissionFen: number; fulfillmentFen: number; productCostFen: number; operatingCostFen: number; operatingContributionFen: number; contributionMarginRate: number; refundedQuantity: number; hasAfterSale: boolean };

export const channelLabel: Record<OrderChannel, string> = { platform: "平台", live: "直播", store: "到店", private: "私域", other: "其他" };
export const refundReasonLabel: Record<RefundReason, string> = { quality_issue: "质量问题", wrong_item: "错发漏发", customer_cancelled: "客户取消", logistics_delay: "物流延误", duplicate_order: "重复下单", other: "其他" };
export const recoveryStatusLabel: Record<ReturnRecoveryStatus, string> = { not_returned: "无需退货", in_transit: "退货在途", sellable_restocked: "可售回收入库", damaged_disposed: "破损报废" };

export const lineRevenueFen = (line: OrderLine) => line.quantity * line.unitPriceFen;
export const lineCogsFen = (line: OrderLine) => line.quantity * line.unitCostFen;
export const orderGrossFen = (order: Order) => order.lines.reduce((sum, line) => sum + lineRevenueFen(line), 0);
export const orderCogsFen = (order: Order) => order.lines.reduce((sum, line) => sum + lineCogsFen(line), 0);
export const refundableQuantity = (line: OrderLine) => Math.max(0, line.quantity - line.refundedQuantity);

/**
 * 单笔订单的售后后经营口径。
 * 退款直接冲减收入；仅可售回收入库冲回已售成本；退款手续费按实际发生计入成本。
 * 渠道扣点和履约费用仍是创建订单时渠道快照的估算值，因此与实际发生费用分开披露。
 */
export function getOrderAfterSalesMetrics(order: Order, refunds: RefundCase[] = []): OrderAfterSalesMetrics {
  const orderRefunds = refunds.filter((refund) => refund.orderId === order.id && refund.workspaceId === order.workspaceId && refund.industryId === order.industryId);
  const grossSalesFen = orderGrossFen(order);
  const refundFen = orderRefunds.reduce((sum, refund) => sum + refund.refundFen, 0);
  const netRevenueFen = grossSalesFen - refundFen;
  const grossCogsFen = orderCogsFen(order);
  const recoveredCostFen = orderRefunds.reduce((sum, refund) => sum + refund.recoveredCostFen, 0);
  const netCogsFen = grossCogsFen - recoveredCostFen;
  const refundFeeFen = orderRefunds.reduce((sum, refund) => sum + refund.refundFeeFen, 0);
  const estimatedCommissionFen = toFen(fromFen(netRevenueFen) * order.pricing.commissionRatePct / 100);
  const fulfillmentFen = toFen(order.lines.reduce((sum, line) => sum + line.quantity, 0) * order.pricing.fulfillmentCost);
  const productCostFen = netCogsFen + refundFeeFen;
  const operatingCostFen = productCostFen + estimatedCommissionFen + fulfillmentFen;
  const operatingContributionFen = netRevenueFen - operatingCostFen;
  return { grossSalesFen, refundFen, netRevenueFen, grossCogsFen, recoveredCostFen, netCogsFen, refundFeeFen, estimatedCommissionFen, fulfillmentFen, productCostFen, operatingCostFen, operatingContributionFen, contributionMarginRate: netRevenueFen > 0 ? Number((operatingContributionFen / netRevenueFen * 100).toFixed(1)) : 0, refundedQuantity: orderRefunds.reduce((sum, refund) => sum + refund.quantity, 0), hasAfterSale: orderRefunds.length > 0 };
}

export function getOrderPricingAlert(order: Order, refunds: RefundCase[] = []): OrderPricingAlert | null {
  const afterSales = getOrderAfterSalesMetrics(order, refunds);
  const revenue = fromFen(afterSales.netRevenueFen);
  const cogs = fromFen(afterSales.netCogsFen);
  const quantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const commission = fromFen(afterSales.estimatedCommissionFen);
  const fulfillment = fromFen(afterSales.fulfillmentFen);
  const contribution = fromFen(afterSales.operatingContributionFen);
  const contributionMarginRate = afterSales.contributionMarginRate;
  const breakEvenRevenue = order.pricing.commissionRatePct < 100 ? Number(((cogs + fromFen(afterSales.refundFeeFen) + fulfillment) / (1 - order.pricing.commissionRatePct / 100)).toFixed(2)) : Infinity;
  const type = contribution < 0 ? "below_break_even" as const : contributionMarginRate < order.pricing.targetContributionMarginPct ? "below_target_margin" as const : null;
  return type ? { id: `${order.id}-${type}`, orderId: order.id, orderNo: order.orderNo, channel: order.channel, type, revenue, cogs, commission: Number(commission.toFixed(2)), fulfillment: Number(fulfillment.toFixed(2)), contribution, contributionMarginRate, breakEvenRevenue, targetMarginRate: order.pricing.targetContributionMarginPct } : null;
}

export function buildOrderEntries(input: { order: Order; cogsCategoryKey: string; now: string }): LedgerEntry[] {
  const { order, cogsCategoryKey, now } = input;
  const base = { workspaceId: order.workspaceId, industryId: order.industryId, templateVersion: 3, occurredAt: order.occurredAt, merchant: order.buyer || "订单客户", status: "posted" as const, hasAttachment: false, createdAt: now, updatedAt: now, orderId: order.id };
  const sale: LedgerEntry = { ...base, id: order.saleEntryId, eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow", amountFen: orderGrossFen(order), categoryKey: "sales", note: `${order.orderNo} · ${channelLabel[order.channel]}订单` };
  const cogs = order.lines.map((line) => ({ ...base, id: `${order.id}-cogs-${line.id}`, eventType: "expense" as const, ledgerRole: "cogs" as const, cashDirection: "none" as const, amountFen: lineCogsFen(line), categoryKey: cogsCategoryKey, note: `${order.orderNo} · ${line.skuName} 已售成本`, skuId: line.skuId, relatedEntryId: sale.id }));
  return [sale, ...cogs];
}

export function buildRefundEntries(input: { refund: RefundCase; order: Order; line: OrderLine; now: string }): LedgerEntry[] {
  const { refund, order, line, now } = input;
  const base = { workspaceId: refund.workspaceId, industryId: refund.industryId, templateVersion: 3, occurredAt: refund.occurredAt, merchant: order.buyer || "订单客户", status: "posted" as const, hasAttachment: false, createdAt: now, updatedAt: now, orderId: order.id, skuId: line.skuId, refundReason: refund.reason, returnRecoveryStatus: refund.recoveryStatus };
  const customerRefund: LedgerEntry = { ...base, id: refund.refundEntryId, eventType: "customer_refund", ledgerRole: "revenue", cashDirection: "outflow", amountFen: refund.refundFen, categoryKey: "returns", note: `${order.orderNo} · ${line.skuName} · ${refundReasonLabel[refund.reason]}`, relatedEntryId: order.saleEntryId };
  const result = [customerRefund];
  if (refund.refundFeeFen > 0) result.push({ ...base, id: `${refund.id}-fee`, eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: refund.refundFeeFen, categoryKey: "returns", note: `${order.orderNo} · 退款手续费`, relatedEntryId: customerRefund.id });
  if (refund.recoveryStatus === "sellable_restocked" && refund.recoveredCostFen > 0) result.push({ ...base, id: `${refund.id}-recovery`, eventType: "inventory_return", ledgerRole: "cogs", cashDirection: "none", amountFen: -refund.recoveredCostFen, categoryKey: "returns", note: `${order.orderNo} · ${line.skuName} 可售回收入库`, relatedEntryId: customerRefund.id });
  return result;
}

export function makeRefundAmount(line: OrderLine, quantity: number) { return toFen((line.unitPriceFen / 100) * quantity); }
