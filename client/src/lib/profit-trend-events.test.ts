import { describe, expect, it } from "vitest";
import { buildProfitTrendEvents } from "./profit-trend-events";
import type { LedgerEntry } from "./ledger-metrics";
import type { Order, RefundCase } from "./order-ledger";

const order: Order = { id: "order-1", workspaceId: "workspace-main", industryId: "ecommerce", orderNo: "ORD-001", channel: "platform", buyer: "客户", occurredAt: "2026-07-14", status: "paid", lines: [], pricing: { commissionRatePct: 0, fulfillmentCost: 0, targetContributionMarginPct: 40 }, saleEntryId: "sale-1", createdAt: "2026-07-14T08:00:00.000Z", updatedAt: "2026-07-14T08:00:00.000Z" };
const refund: RefundCase = { id: "refund-1", workspaceId: "workspace-main", industryId: "ecommerce", orderId: order.id, orderLineId: "line-1", skuId: "sku-1", quantity: 1, refundFen: 6800, refundFeeFen: 0, reason: "quality_issue", recoveryStatus: "not_returned", recoveredCostFen: 0, occurredAt: "2026-08-03", refundEntryId: "refund-entry-1", createdAt: "2026-08-03T08:00:00.000Z" };
const entry = (id: string, overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({ id, workspaceId: "workspace-main", industryId: "ecommerce", templateVersion: 5, occurredAt: "2026-08-08", eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: 12200, categoryKey: "ad_spend", merchant: "投放平台", note: "推广成本", status: "posted", hasAttachment: false, createdAt: "2026-08-08T08:00:00.000Z", updatedAt: "2026-08-08T08:00:00.000Z", ...overrides });

describe("利润趋势真实事件", () => {
  it("只按真实成交日、退款日与独立成本分录生成事件，并排除订单自动产生的已售成本", () => {
    const result = buildProfitTrendEvents({ months: ["2026-07", "2026-08"], industryId: "ecommerce", orders: [order], refunds: [refund], entries: [entry("direct-cost"), entry("order-cogs", { orderId: order.id, ledgerRole: "cogs", amountFen: 5600 }), entry("foreign-cost", { industryId: "retail" })] });

    expect(result).toEqual([
      { id: "2026-08-refunds", month: "2026-08", type: "refunds", title: "1 笔退款发生", amount: 68 },
      { id: "2026-08-costs", month: "2026-08", type: "costs", title: "录入 1 笔成本", amount: 122 },
      { id: "2026-07-orders", month: "2026-07", type: "orders", title: "1 笔订单成交", amount: 0 },
    ]);
  });

  it("没有真实业务来源时不生成促销、涨价或其他虚构事件", () => {
    expect(buildProfitTrendEvents({ months: ["2026-08"], industryId: "ecommerce", orders: [], refunds: [], entries: [] })).toEqual([]);
  });
});
