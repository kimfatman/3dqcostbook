import type { Report } from "./cost-book";

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const yuan = (value: number) => value.toFixed(2);

export function buildReportCsv(input: { report: Report; industryLabel: string; storeName: string }) {
  const { report, industryLabel, storeName } = input;
  const rows: (string | number)[][] = [
    ["算得清月度经营报表"],
    ["店铺", storeName],
    ["行业", industryLabel],
    ["账期", report.month],
    ["状态", report.status === "closed" ? "已封存" : "实时草稿"],
    [],
    ["经营指标", "金额（元）", "比率"],
    ["净营收", yuan(report.revenue), ""],
    ["总成本", yuan(report.cost), ""],
    ["毛利", yuan(report.margin), `${report.grossMarginRate}%`],
    ["经营利润率", "", `${report.operatingMarginRate}%`],
    [],
    ["成本分类", "金额（元）", "成本占比", "较上期"],
    ...report.snapshot.map((item) => [item.label, yuan(item.amount), `${item.pct}%`, `${item.delta >= 0 ? "+" : ""}${yuan(item.delta)}`]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
