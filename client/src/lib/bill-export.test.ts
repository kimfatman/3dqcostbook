import { afterEach, describe, expect, it, vi } from "vitest";
import type { CostRecord } from "./cost-book";
import { billExportFilename, buildBillCsv, buildBillExportModel, downloadBillExport, protectSpreadsheetText } from "./bill-export";

const xlsx = vi.hoisted(() => {
  const worksheet: Record<string, unknown> = { E8: {} };
  return {
    worksheet,
    aoaToSheet: vi.fn(() => worksheet),
    bookNew: vi.fn(() => ({ sheets: [] })),
    bookAppendSheet: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: xlsx.aoaToSheet,
    book_new: xlsx.bookNew,
    book_append_sheet: xlsx.bookAppendSheet,
  },
  writeFile: xlsx.writeFile,
}));

const records: CostRecord[] = [
  { id: "income-1", workspaceId: "w", industryId: "retail", templateVersion: 2, occurredAt: "2026-08-14", date: "2026-08-14", eventType: "sale", ledgerRole: "revenue", cashDirection: "inflow", amountFen: 125050, amount: 1250.5, categoryKey: "sales", merchant: "晴空,严选\"旗舰店\"", note: "平台日结", status: "accounted", hasAttachment: true, orderId: "o-1", createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z", type: "income" },
  { id: "expense-1", workspaceId: "w", industryId: "retail", templateVersion: 2, occurredAt: "2026-08-13", date: "2026-08-13", eventType: "expense", ledgerRole: "cogs", cashDirection: "outflow", amountFen: 48000, amount: 480, categoryKey: "goods", merchant: "=SUM(1,1)", note: "补货,含税", status: "pending", hasAttachment: false, supplierId: "s-1", createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z", type: "expense" },
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

  it("为 CSV 输出 BOM、中文转义、公式文本保护和安全文件名", () => {
    const csv = buildBillCsv(model);
    expect(protectSpreadsheetText("=SUM(1,1)")).toBe("'=SUM(1,1)");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"晴空,严选""旗舰店"""');
    expect(csv).toContain('"\'=SUM(1,1)"');
    expect(csv).toContain('"补货,含税"');
    expect(csv).toContain('"-480.00"');
    expect(csv).toContain("关键词：补货");
    expect(billExportFilename(model, "xlsx")).toBe("橙子优选店-2026-08-经营流水.xlsx");
  });

  it("为空结果保留筛选、中文表头与零笔数，而不生成伪造流水", () => {
    const empty = buildBillExportModel({
      records: [],
      storeName: "小林的美业工作室",
      industryLabel: "美业服务",
      filters: { month: "all", type: "refund", query: "退款" },
      categoryLabel: () => "不应调用",
      channelLabel: () => "不应调用",
      supplierName: () => "不应调用",
      orderNo: () => "不应调用",
    });
    const csv = buildBillCsv(empty);

    expect(empty.rows).toEqual([]);
    expect(csv).toContain('"筛选范围","全部月份 · 退款 · 关键词：退款"');
    expect(csv).toContain('"导出笔数","0"');
    expect(csv).toContain('"日期","收支类型","分类","商户","金额（元）"');
    expect(csv).not.toContain("不应调用");
  });

  it("净化非法文件名字符，并将真实 XLSX 工作表保留为可筛选的数值金额表", async () => {
    const filenameModel = buildBillExportModel({
      records: [],
      storeName: "=华东/店:*?\"<>|",
      industryLabel: "零售",
      filters: { month: "all", type: "all", query: "" },
      categoryLabel: () => "",
      channelLabel: () => "",
      supplierName: () => "",
      orderNo: () => "",
    });
    expect(billExportFilename(filenameModel, "csv")).toBe("'=华东-店--------全部月份-经营流水.csv");

    await downloadBillExport(model, "xlsx");

    expect(xlsx.aoaToSheet).toHaveBeenCalledWith(expect.arrayContaining([
      ["算得清经营流水"],
      ["筛选范围", "2026-08 月 · 全部类型 · 平台 · 供货商 A · 关键词：补货"],
      ["日期", "收支类型", "分类", "商户", "金额（元）", "状态", "渠道", "供应商", "订单号", "是否有凭证", "备注"],
      expect.arrayContaining(["2026-08-13", "成本", "商品采购", "'=SUM(1,1)", -480]),
    ]));
    expect(xlsx.worksheet["!freeze"]).toEqual({ xSplit: 0, ySplit: 7 });
    expect(xlsx.worksheet["!autofilter"]).toEqual({ ref: "A7:K9" });
    expect(xlsx.worksheet.E8).toEqual({ z: "¥#,##0.00;[Red]-¥#,##0.00" });
    expect(xlsx.bookAppendSheet).toHaveBeenCalledWith(expect.any(Object), xlsx.worksheet, "经营流水");
    expect(xlsx.writeFile).toHaveBeenCalledWith(expect.any(Object), "橙子优选店-2026-08-经营流水.xlsx", { compression: true });
  });

  afterEach(() => {
    xlsx.aoaToSheet.mockClear();
    xlsx.bookNew.mockClear();
    xlsx.bookAppendSheet.mockClear();
    xlsx.writeFile.mockClear();
    xlsx.worksheet.E8 = {};
  });
});
