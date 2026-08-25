import * as XLSX from "xlsx";
import type { CostRecord } from "./cost-book";

export type BillExportFormat = "csv" | "xlsx";

export type BillExportInput = {
  storeName: string;
  industryLabel: string;
  generatedAt: string;
  filterSummary: string;
  records: CostRecord[];
  categoryLabels: Record<string, string>;
  supplierLabels: Record<string, string>;
  orderMeta: Record<string, { orderNo: string; channelLabel: string }>;
};

type BillRow = {
  日期: string;
  类型: string;
  分类: string;
  商户: string;
  金额: number;
  供应商: string;
  渠道: string;
  订单号: string;
  备注: string;
  凭证: string;
  状态: string;
  流水编号: string;
};

const typeLabel = (type: CostRecord["type"]) => type === "income" ? "收入" : type === "refund" ? "退款" : "支出";
const statusLabel = (status: CostRecord["status"]) => status === "accounted" ? "已核算" : status === "pending" ? "待核算" : "异常";
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** 防止账单中的商户、备注等文本被电子表格程序当作公式执行。 */
export function protectSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function buildBillRows(input: BillExportInput): BillRow[] {
  return input.records.map((record) => {
    const order = record.orderId ? input.orderMeta[record.orderId] : undefined;
    return {
      日期: record.date,
      类型: typeLabel(record.type),
      分类: input.categoryLabels[record.categoryKey] || "未分类",
      商户: protectSpreadsheetText(record.merchant || "未填写"),
      金额: Number(record.amount.toFixed(2)),
      供应商: record.supplierId ? protectSpreadsheetText(input.supplierLabels[record.supplierId] || "未关联") : "",
      渠道: order?.channelLabel || "",
      订单号: order ? protectSpreadsheetText(order.orderNo) : "",
      备注: protectSpreadsheetText(record.note || ""),
      凭证: record.hasAttachment ? "有" : "无",
      状态: statusLabel(record.status),
      流水编号: protectSpreadsheetText(record.id),
    };
  });
}

function metadataRows(input: BillExportInput) {
  return [
    ["算得清账单明细"],
    ["店铺", input.storeName],
    ["行业", input.industryLabel],
    ["筛选范围", input.filterSummary],
    ["导出时间", input.generatedAt],
    [],
  ];
}

const headers = ["日期", "类型", "分类", "商户", "金额", "供应商", "渠道", "订单号", "备注", "凭证", "状态", "流水编号"] as const;

export function buildBillCsv(input: BillExportInput) {
  const rows = [
    ...metadataRows(input),
    [...headers],
    ...buildBillRows(input).map((row) => headers.map((header) => row[header])),
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => csvCell(cell ?? "")).join(",")).join("\r\n")}\r\n`;
}

export function buildBillWorkbook(input: BillExportInput) {
  const rows = buildBillRows(input);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(metadataRows(input));
  XLSX.utils.sheet_add_aoa(worksheet, [[...headers]], { origin: "A7" });
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: "A8", skipHeader: true, header: [...headers] });
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  worksheet["!cols"] = [
    { wch: 13 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 18 },
    { wch: 12 }, { wch: 18 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 22 },
  ];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 7 };
  worksheet["!autofilter"] = { ref: `A7:L${Math.max(8, rows.length + 7)}` };
  for (let row = 8; row < rows.length + 8; row += 1) {
    const amount = worksheet[`E${row}`];
    if (amount) amount.z = "¥#,##0.00;[Red]-¥#,##0.00";
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, "账单明细");
  return workbook;
}

export function buildBillExportBlob(input: BillExportInput, format: BillExportFormat) {
  if (format === "csv") return new Blob([buildBillCsv(input)], { type: "text/csv;charset=utf-8" });
  const bytes = XLSX.write(buildBillWorkbook(input), { bookType: "xlsx", type: "array" });
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function billExportFilename(input: Pick<BillExportInput, "storeName" | "generatedAt">, format: BillExportFormat) {
  const safeStore = input.storeName.replace(/[\\/:*?"<>|]/g, "-") || "账单";
  const date = input.generatedAt.slice(0, 10);
  return `${safeStore}-账单-${date}.${format}`;
}
