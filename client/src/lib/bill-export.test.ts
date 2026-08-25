import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { billExportFilename, buildBillCsv, buildBillRows, buildBillWorkbook, protectSpreadsheetText, type BillExportInput } from "./bill-export";

const input: BillExportInput = {
  storeName: "晴空,严选\"旗舰店\"",
  industryLabel: "电商",
  generatedAt: "2026-08-25T10:30:00.000Z",
  filterSummary: "2026年8月 · 成本 · 搜索：包装",
  categoryLabels: { packaging: "包装,耗材" },
  supplierLabels: { supplier_1: "包装供应商" },
  orderMeta: { order_1: { orderNo: "ORD-001", channelLabel: "平台店" } },
  records: [{ id: "record_1", workspaceId: "workspace", industryId: "ecommerce", templateVersion: 2, occurredAt: "2026-08-24", date: "2026-08-24", type: "expense", eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: 12345, amount: 123.45, categoryKey: "packaging", merchant: "=SUM(1,1)", note: "外箱,气泡膜", status: "accounted", hasAttachment: true, supplierId: "supplier_1", orderId: "order_1", createdAt: "2026-08-24T12:00:00.000Z", updatedAt: "2026-08-24T12:00:00.000Z" }],
};

describe("账单导出", () => {
  it("保留当前筛选的流水字段，并保护电子表格公式文本", () => {
    expect(protectSpreadsheetText("=SUM(1,1)")).toBe("'=SUM(1,1)");
    expect(buildBillRows(input)[0]).toMatchObject({ 日期: "2026-08-24", 分类: "包装,耗材", 金额: 123.45, 商户: "'=SUM(1,1)", 供应商: "包装供应商", 渠道: "平台店", 凭证: "有" });
  });

  it("输出带 BOM、元数据与转义中文字段的 CSV", () => {
    const csv = buildBillCsv(input);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"筛选范围","2026年8月 · 成本 · 搜索：包装"');
    expect(csv).toContain('"晴空,严选""旗舰店"""');
    expect(csv).toContain('"外箱,气泡膜"');
  });

  it("生成可读取的 XLSX 账单明细工作表与金额格式", () => {
    const workbook = buildBillWorkbook(input);
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const parsed = XLSX.read(bytes, { type: "array" });
    const sheet = parsed.Sheets["账单明细"];
    expect(parsed.SheetNames).toEqual(["账单明细"]);
    expect(sheet["A1"]?.v).toBe("算得清账单明细");
    expect(sheet["E8"]?.v).toBe(123.45);
    expect(workbook.Sheets["账单明细"]?.["E8"]?.z).toContain("¥");
    expect(billExportFilename(input, "xlsx")).toBe("晴空,严选-旗舰店--账单-2026-08-25.xlsx");
  });
});
