import { describe, expect, it } from "vitest";
import { buildOrderEntries, buildRefundEntries, getOrderPricingAlert, type Order, type OrderLine, type RefundCase } from "./order-ledger";
import { buildMetrics, toFen } from "./ledger-metrics";

const lines: OrderLine[] = [
  { id: "line-a", skuId: "sku-a", skuCode: "EC-001", skuName: "收纳盒", unit: "件", quantity: 2, refundedQuantity: 0, unitPriceFen: 6800, unitCostFen: 3980 },
  { id: "line-b", skuId: "sku-b", skuCode: "EC-002", skuName: "夏凉被", unit: "件", quantity: 1, refundedQuantity: 0, unitPriceFen: 13900, unitCostFen: 8350 },
];
const order: Order = { id: "order-1", workspaceId: "w", industryId: "ecommerce", orderNo: "P-001", channel: "platform", buyer: "张女士", occurredAt: "2026-07-14", status: "paid", lines, pricing: { commissionRatePct: 5, fulfillmentCost: 3, targetContributionMarginPct: 40, roundingStep: 1 }, saleEntryId: "sale-1", createdAt: "now", updatedAt: "now" };

describe("订单、SKU 与退款回收账本", () => {
  it("多 SKU 订单同时生成一笔销售收入和逐 SKU 已售成本", () => {
    const entries = buildOrderEntries({ order, cogsCategoryKey: "goods_purchase", now: "now" });
    expect(entries).toHaveLength(3);
    expect(entries[0].amountFen).toBe(27500);
    expect(entries.slice(1).map((entry) => entry.amountFen)).toEqual([7960, 8350]);
    expect(entries.slice(1).every((entry) => entry.skuId && entry.ledgerRole === "cogs")).toBe(true);
  });

  it("可售回收入库才冲回对应 SKU 的已售成本", () => {
    const refund: RefundCase = { id: "refund-a", workspaceId: "w", industryId: "ecommerce", orderId: order.id, orderLineId: "line-a", skuId: "sku-a", quantity: 1, refundFen: 6800, refundFeeFen: 120, reason: "quality_issue", recoveryStatus: "sellable_restocked", recoveredCostFen: 3980, occurredAt: "2026-07-15", refundEntryId: "refund-entry-a", createdAt: "now" };
    const entries = buildRefundEntries({ refund, order, line: lines[0], now: "now" });
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ eventType: "customer_refund", amountFen: 6800, refundReason: "quality_issue" });
    expect(entries[2]).toMatchObject({ eventType: "inventory_return", amountFen: -3980, returnRecoveryStatus: "sellable_restocked" });
  });

  it("破损报废退款不会错误冲回商品成本", () => {
    const refund: RefundCase = { id: "refund-b", workspaceId: "w", industryId: "ecommerce", orderId: order.id, orderLineId: "line-b", skuId: "sku-b", quantity: 1, refundFen: 13900, refundFeeFen: 0, reason: "logistics_delay", recoveryStatus: "damaged_disposed", recoveredCostFen: 0, occurredAt: "2026-07-15", refundEntryId: "refund-entry-b", createdAt: "now" };
    const entries = buildRefundEntries({ refund, order, line: lines[1], now: "now" });
    expect(entries).toHaveLength(1);
    expect(entries.some((entry) => entry.eventType === "inventory_return")).toBe(false);
  });

  it("订单退款、手续费和可售回收共同形成可复算的商品利润桥接", () => {
    const orderEntries = buildOrderEntries({ order, cogsCategoryKey: "goods_purchase", now: "now" });
    const refund: RefundCase = { id: "refund-c", workspaceId: "w", industryId: "ecommerce", orderId: order.id, orderLineId: "line-a", skuId: "sku-a", quantity: 1, refundFen: 6800, refundFeeFen: 120, reason: "wrong_item", recoveryStatus: "sellable_restocked", recoveredCostFen: 3980, occurredAt: "2026-07-15", refundEntryId: "refund-entry-c", createdAt: "now" };
    const metrics = buildMetrics([...orderEntries, ...buildRefundEntries({ refund, order, line: lines[0], now: "now" })], { amountFen: toFen(1000), basis: "operating_cost" });
    expect(metrics.netRevenueFen).toBe(20700);
    expect(metrics.cogsFen).toBe(12330);
    expect(metrics.operatingExpenseFen).toBe(120);
    expect(metrics.grossProfitFen).toBe(8370);
  });

  it("佣金和单件履约费会按订单创建时的渠道快照识别低于目标毛利风险", () => {
    const warning = getOrderPricingAlert(order);
    expect(warning).toMatchObject({ type: "below_target_margin", commission: 13.75, fulfillment: 9, contributionMarginRate: 32.4, targetMarginRate: 40 });
  });

  it("当订单实收低于扣除渠道费后的保本线时优先标识亏损风险", () => {
    const lossOrder: Order = { ...order, id: "loss", lines: [{ ...lines[0], unitPriceFen: 2000, quantity: 1, unitCostFen: 3980 }], pricing: { commissionRatePct: 5, fulfillmentCost: 3, targetContributionMarginPct: 40, roundingStep: 1 } };
    expect(getOrderPricingAlert(lossOrder)).toMatchObject({ type: "below_break_even", breakEvenRevenue: 45.05, contribution: -23.8 });
  });
});
