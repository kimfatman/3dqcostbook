import { describe, expect, it } from "vitest";
import type { CostRecord } from "./cost-book";
import { billExportFilename, buildBillCsv, buildBillExportModel } from "./bill-export";

const records: CostRecord[] = [
  { id: "income-1", workspaceId: "w", industryId: "retail", templateVersion: 2, occurredAt: "2026-08-14", date: "2026-08-14", eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow", amountFen: 125050, amount: 1250.5, categoryKey: "sales", merchant: "晴空,严选\"旗舰店\"", note: "平台日结", status: "accounted", hasAttachment: true, orderId: "o-1", createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z", type: "income" },
  { id: "expense-1", workspaceId: "w", industryId: "retail", templateVersion: 2, occurredAt: "2026-08-13", date: "2026-08-13", eventType: "expense", ledgerRole: "cogs", cashDirection: "outflow", amountFen: 48000, amount: 480, categoryKey: "goods", merchant: "供货商 A", note: "补货", status: "pending", hasAttachment: false, supplierId: "s-1", createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z", type: "expense" },
];

describe("账单导出", () => {
  const model = buildBillExportModel({
    records,
    storeName: "橙子优选店",
    industryLabel: "零售",
    filters: { month: "2026-08", type: "all", query: "补货", channelLabel: "平台", supplierName: "供货商 A" },
    categoryLabel: (key) => key === "sales" ? "销售收入" : "商品采购",
    channelLabel: (record) => record.orderId ? "平台" : "",
    supplierName: (id) => id === "s-1" ? "供货商 A" : "",
    orderNo: (id) => id === "o-1" ? "ORD-001" : "",
  });

  it("保留筛选范围、关联维度和正负金额语义", () => {
    expect(model.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "收入", amount: 1250.5, channel: "平台", orderNo: "ORD-001" }),
      expect.objectContaining({ type: "成本", amount: -480, supplier: "供货商 A", status: "待确认" }),
    ]));
  });

  it("为 CSV 输出 BOM、中文字段和安全转义，并生成可读文件名", () => {
    const csv = buildBillCsv(model);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"晴空,严选""旗舰店"""');
    expect(csv).toContain('"-480.00"');
    expect(csv).toContain("关键词：补货");
    expect(billExportFilename(model, "xlsx")).toBe("橙子优选店-2026-08-经营流水.xlsx");
  });
});
