import type { IndustryId } from "./cost-book";
import type { Order } from "./order-ledger";

export type OrderReviewUpdate = {
  orderIds: string[];
  industryId: IndustryId;
  reviewedAt?: string;
};

/**
 * 订单复核仅是经营跟进元数据。
 * 它不修改成交日期、订单行、价格、退款、成本快照或任何账务分录。
 */
export function applyOrderReviewState(orders: Order[], update: OrderReviewUpdate): Order[] {
  const selected = new Set(update.orderIds);
  if (!selected.size) return orders;

  return orders.map((order) => {
    if (order.industryId !== update.industryId || !selected.has(order.id)) return order;
    if (update.reviewedAt) return { ...order, reviewedAt: update.reviewedAt };
    const { reviewedAt: _reviewedAt, ...unreviewedOrder } = order;
    return unreviewedOrder;
  });
}
