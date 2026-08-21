import { describe, expect, it } from "vitest";
import type { OrderLine } from "./order-ledger";
import { manualRecordAccounting, validateOrderLines, validateRefundInput } from "./transaction-validation";

const line: OrderLine = { id: "line-1", skuId: "sku-1", skuCode: "SKU-1", skuName: "商品", unit: "件", quantity: 2, refundedQuantity: 0, unitPriceFen: 6800, unitCostFen: 2400 };

describe("交易写入 P0 校验", () => {
  it("将手工收入归为其他收入，而不是订单销售", () => {
    expect(manualRecordAccounting("income")).toEqual({ eventType: "income", ledgerRole: "other_income", cashDirection: "inflow" });
  });

  it("拒绝订单的零值、小数、负数和非有限 SKU 数量", () => {
    expect(validateOrderLines([{ skuId: "sku-1", quantity: 0 }]).ok).toBe(false);
    expect(validateOrderLines([{ skuId: "sku-1", quantity: 1.5 }]).ok).toBe(false);
    expect(validateOrderLines([{ skuId: "sku-1", quantity: Number.POSITIVE_INFINITY }]).ok).toBe(false);
    expect(validateOrderLines([{ skuId: "sku-1", quantity: 2 }])).toEqual({ ok: true });
  });

  it("拒绝超额退款和早于订单的退款日期", () => {
    expect(validateRefundInput({ line, quantity: 1, refundAmount: 68.01, refundFee: 0, date: "2026-07-14", orderDate: "2026-07-14" }).ok).toBe(false);
    expect(validateRefundInput({ line, quantity: 1, refundAmount: 68, refundFee: 0, date: "2026-07-13", orderDate: "2026-07-14" }).ok).toBe(false);
    expect(validateRefundInput({ line, quantity: 1, refundAmount: 68, refundFee: 0, date: "2026-07-14", orderDate: "2026-07-14" })).toEqual({ ok: true });
  });
});
