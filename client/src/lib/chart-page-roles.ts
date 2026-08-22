export type ChartPageRoleId = "home" | "analysis" | "budget";

export const chartPageRoles = {
  home: {
    primary: "经营结果与单一趋势入口",
    allowed: ["经营结果", "销售目标", "经营趋势"],
    excluded: ["现金流收支", "经营健康度", "成本结构堆积", "预算燃尽"],
  },
  analysis: {
    primary: "利润结果、收支趋势与成本原因",
    allowed: ["利润瀑布", "收入与成本趋势", "成本变化排行"],
    excluded: ["预算燃尽", "经营健康度", "现金流收支", "成本结构堆积"],
  },
  budget: {
    primary: "预算进度与月末预测",
    allowed: ["预算环", "预算燃尽趋势"],
    excluded: ["利润瀑布", "收入与成本趋势", "成本变化排行"],
  },
} as const;

export function chartRole(page: ChartPageRoleId) {
  return chartPageRoles[page];
}
