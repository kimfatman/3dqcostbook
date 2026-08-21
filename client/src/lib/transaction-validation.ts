import { toFen, type CashDirection, type LedgerEventType, type LedgerRole } from "./ledger-metrics";
import type { OrderLine } from "./order-ledger";

export type ManualRecordType = "expense" | "income" | "refund";

export function manualRecordAccounting(type: ManualRecordType, categoryRole?: "cogs" | "opex" | "other_income") {
  if (type === "income") {
    return { eventType: "income" as LedgerEventType, ledgerRole: "other_income" as LedgerRole, cashDirection: "inflow" as CashDirection };
  }
  if (type === "refund") {
    return { eventType: "customer_refund" as LedgerEventType, ledgerRole: "revenue" as LedgerRole, cashDirection: "outflow" as CashDirection };
  }
  return { eventType: "expense" as LedgerEventType, ledgerRole: categoryRole === "cogs" ? "cogs" as LedgerRole : "opex" as LedgerRole, cashDirection: "outflow" as CashDirection };
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateOrderLines(lines: { skuId: string; quantity: number }[]) {
  if (!lines.length) return { ok: false as const, reason: "请至少添加一个 SKU" };
  if (lines.some((line) => !line.skuId || !Number.isFinite(line.quantity) || !Number.isInteger(line.quantity) || line.quantity <= 0)) {
    return { ok: false as const, reason: "每个 SKU 数量必须为正整数" };
  }
  return { ok: true as const };
}

export function validateRefundInput(input: { line: OrderLine; quantity: number; refundAmount: number; refundFee: number; date: string; orderDate: string }) {
  if (!Number.isFinite(input.quantity) || !Number.isInteger(input.quantity) || input.quantity <= 0) return { ok: false as const, reason: "退款数量必须为正整数" };
  if (input.quantity > input.line.quantity - input.line.refundedQuantity) return { ok: false as const, reason: "退款数量超过可退数量" };
  if (!Number.isFinite(input.refundAmount) || input.refundAmount <= 0) return { ok: false as const, reason: "请填写正确的退款金额" };
  if (!Number.isFinite(input.refundFee) || input.refundFee < 0) return { ok: false as const, reason: "退款手续费不能为负数" };
  if (!isCalendarDate(input.date)) return { ok: false as const, reason: "请填写正确的退款日期" };
  if (input.date < input.orderDate) return { ok: false as const, reason: "退款日期不能早于订单成交日期" };
  const allowedFen = input.line.unitPriceFen * input.quantity;
  if (toFen(input.refundAmount) > allowedFen) return { ok: false as const, reason: "退款金额不能超过该 SKU 的成交收入" };
  return { ok: true as const };
}
