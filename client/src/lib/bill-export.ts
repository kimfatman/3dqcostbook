import type { CostRecord, RecordType } from "./cost-book";

export type BillExportFormat = "csv" | "xlsx";

export type BillExportFilters = {
  month: string;
  type: RecordType | "all";
  query: string;
  channelLabel?: string;
  supplierName?: string;
};

export type BillExportRow = {
  date: string;
  type: string;
  category: string;
  merchant: string;
  amount: number;
  status: string;
  channel: string;
  supplier: string;
  orderNo: string;
  attachment: string;
  note: string;
};

export type BillExportModel = {
  title: string;
  storeName: string;
  industryLabel: string;
  filters: BillExportFilters;
  rows: BillExportRow[];
};

type BillExportInput = {
  records: CostRecord[];
  storeName: string;
  industryLabel: string;
  filters: BillExportFilters;
  categoryLabel: (categoryKey: string) => string;
  channelLabel: (record: CostRecord) => string;
  supplierName: (supplierId?: string) => string;
  orderNo: (orderId?: string) => string;
};

const typeLabel: Record<RecordType, string> = { expense: "成本", income: "收入", refund: "退款" };
const statusLabel = (status: CostRecord["status"]) => status === "accounted" ? "已入账" : status === "pending" ? "待确认" : "异常";
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function filterSummary(filters: BillExportFilters) {
  const values = [
    filters.month === "all" ? "全部月份" : `${filters.month} 月`,
    filters.type === "all" ? "全部类型" : typeLabel[filters.type],
    filters.channelLabel || "",
    filters.supplierName || "",
    filters.query.trim() ? `关键词：${filters.query.trim()}` : "",
  ].filter(Boolean);
  return values.join(" · ");
}

export function buildBillExportModel(input: BillExportInput): BillExportModel {
  return {
    title: "算得清经营流水",
    storeName: input.storeName,
    industryLabel: input.industryLabel,
    filters: input.filters,
    rows: input.records.map((record) => ({
      date: record.date,
      type: typeLabel[record.type],
      category: input.categoryLabel(record.categoryKey) || "未分类",
      merchant: record.merchant,
      amount: record.type === "income" ? record.amount : -record.amount,
      status: statusLabel(record.status),
      channel: input.channelLabel(record),
      supplier: input.supplierName(record.supplierId),
      orderNo: input.orderNo(record.orderId),
      attachment: record.hasAttachment ? "有" : "无",
      note: record.note,
    })),
  };
}

export function buildBillCsv(model: BillExportModel) {
  const rows: (string | number)[][] = [
    [model.title],
    ["店铺", model.storeName],
    ["行业", model.industryLabel],
    ["筛选范围", filterSummary(model.filters)],
    ["导出笔数", model.rows.length],
    [],
    ["日期", "收支类型", "分类", "商户", "金额（元）", "状态", "渠道", "供应商", "订单号", "是否有凭证", "备注"],
    ...model.rows.map((row) => [row.date, row.type, row.category, row.merchant, row.amount.toFixed(2), row.status, row.channel, row.supplier, row.orderNo, row.attachment, row.note]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function billExportFilename(model: BillExportModel, format: BillExportFormat) {
  const month = model.filters.month === "all" ? "全部月份" : model.filters.month;
  return `${model.storeName}-${month}-经营流水.${format === "xlsx" ? "xlsx" : "csv"}`;
}

function buildWorksheetRows(model: BillExportModel): (string | number)[][] {
  return [
    [model.title],
    ["店铺", model.storeName],
    ["行业", model.industryLabel],
    ["筛选范围", filterSummary(model.filters)],
    ["导出笔数", model.rows.length],
    [],
    ["日期", "收支类型", "分类", "商户", "金额（元）", "状态", "渠道", "供应商", "订单号", "是否有凭证", "备注"],
    ...model.rows.map((row) => [row.date, row.type, row.category, row.merchant, row.amount, row.status, row.channel, row.supplier, row.orderNo, row.attachment, row.note]),
  ];
}

export async function downloadBillExport(model: BillExportModel, format: BillExportFormat) {
  const filename = billExportFilename(model, format);
  if (format === "csv") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([buildBillCsv(model)], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }

  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(buildWorksheetRows(model));
  worksheet["!cols"] = [12, 10, 14, 20, 14, 10, 12, 16, 16, 12, 28].map((wch) => ({ wch }));
  for (let rowIndex = 8; rowIndex < 8 + model.rows.length; rowIndex += 1) {
    const cell = worksheet[`E${rowIndex}`];
    if (cell) cell.z = "¥#,##0.00;[Red]-¥#,##0.00";
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "经营流水");
  XLSX.writeFile(workbook, filename, { compression: true });
}
