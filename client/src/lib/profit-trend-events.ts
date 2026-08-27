import type { IndustryId } from "./cost-book";
import type { LedgerEntry } from "./ledger-metrics";
import type { Order, RefundCase } from "./order-ledger";

export type ProfitTrendEvent = {
  id: string;
  month: string;
  type: "orders" | "refunds" | "costs";
  title: string;
  amount: number;
};

/**
 * 仅聚合可追溯到现有业务记录的事件。
 * 订单按成交日、退款按退款日、成本按独立支出日期归属；订单自动产生的已售成本
 * 不重复标记为“成本录入”。
 */
export function buildProfitTrendEvents(input: { months: string[]; industryId: IndustryId; orders: Order[]; refunds: RefundCase[]; entries: LedgerEntry[] }): ProfitTrendEvent[] {
  const months = new Set(input.months);
  const events: ProfitTrendEvent[] = [];

  input.months.forEach((month) => {
    const orders = input.orders.filter((order) => order.industryId === input.industryId && order.occurredAt.startsWith(month));
    if (orders.length) events.push({ id: `${month}-orders`, month, type: "orders", title: `${orders.length} 笔订单成交`, amount: 0 });

    const refunds = input.refunds.filter((refund) => refund.industryId === input.industryId && refund.occurredAt.startsWith(month));
    if (refunds.length) events.push({ id: `${month}-refunds`, month, type: "refunds", title: `${refunds.length} 笔退款发生`, amount: refunds.reduce((sum, refund) => sum + refund.refundFen, 0) / 100 });

    const costs = input.entries.filter((entry) => entry.industryId === input.industryId && months.has(entry.occurredAt.slice(0, 7)) && entry.occurredAt.startsWith(month) && entry.eventType === "expense" && !entry.orderId && !entry.relatedEntryId);
    if (costs.length) events.push({ id: `${month}-costs`, month, type: "costs", title: `录入 ${costs.length} 笔成本`, amount: costs.reduce((sum, entry) => sum + entry.amountFen, 0) / 100 });
  });

  return events.sort((left, right) => right.month.localeCompare(left.month));
}
