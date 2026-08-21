import { describe, expect, it } from "vitest";
import { buildReportCsv } from "./report-export";

describe("月报 CSV 导出", () => {
  it("输出 BOM、核心经营指标与分类快照，并对逗号和引号进行 CSV 转义", () => {
    const csv = buildReportCsv({
      industryLabel: "电商",
      storeName: "晴空,严选\"旗舰店\"",
      report: { id: "r", workspaceId: "w", industryId: "ecommerce", month: "2026-08", revenue: 1200.5, cost: 700.25, margin: 500.25, grossMarginRate: 41.7, operatingMarginRate: 29.2, status: "closed", snapshot: [{ key: "goods", label: "采购", amount: 420.5, pct: 60, delta: -12.3 }] },
    });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"晴空,严选""旗舰店"""');
    expect(csv).toContain('"净营收","1200.50",""');
    expect(csv).toContain('"采购","420.50","60%","-12.30"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
