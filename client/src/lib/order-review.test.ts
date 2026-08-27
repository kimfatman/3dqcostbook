import { describe, expect, it } from "vitest";
import { applyOrderReviewState } from "./order-review";
import type { Order } from "./order-ledger";

const makeOrder = (id: string, industryId: Order["industryId"]): Order => ({
  id,
  workspaceId: "workspace-main",
  industryId,
  orderNo: id,
  channel: "platform",
  buyer: "客户",
  occurredAt: "2026-08-27",
  status: "paid",
  lines: [{ id: `${id}-line`, skuId: "sku-1", skuCode: "SKU-001", skuName: "商品", unit: "件", quantity: 2, refundedQuantity: 0, unitPriceFen: 12800, unitCostFen: 5600 }],
  pricing: { commissionRatePct: 4, fulfillmentCost: 2, targetContributionMarginPct: 40 },
  saleEntryId: `${id}-sale`,
  createdAt: "2026-08-27T08:00:00.000Z",
  updatedAt: "2026-08-27T08:00:00.000Z",
});

describe("订单复核状态", () => {
  it("只为当前行业选中的订单写入复核元数据，不改动订单金额、数量或成本快照", () => {
    const ecommerce = makeOrder("order-1", "ecommerce");
    const retail = makeOrder("order-2", "retail");
    const result = applyOrderReviewState([ecommerce, retail], { orderIds: [ecommerce.id, retail.id], industryId: "ecommerce", reviewedAt: "2026-08-27T09:00:00.000Z" });

    expect(result[0]).toMatchObject({ id: ecommerce.id, reviewedAt: "2026-08-27T09:00:00.000Z", occurredAt: ecommerce.occurredAt, lines: ecommerce.lines, pricing: ecommerce.pricing });
    expect(result[1]).toEqual(retail);
    expect(ecommerce.reviewedAt).toBeUndefined();
  });

  it("取消复核只移除复核元数据，不删除或重算原始订单", () => {
    const reviewed = { ...makeOrder("order-3", "ecommerce"), reviewedAt: "2026-08-27T09:00:00.000Z" };
    const result = applyOrderReviewState([reviewed], { orderIds: [reviewed.id], industryId: "ecommerce" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: reviewed.id, lines: reviewed.lines, status: "paid" });
    expect(result[0].reviewedAt).toBeUndefined();
  });
});
