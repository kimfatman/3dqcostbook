import { describe, expect, it } from "vitest";
import { buildCostAnalysisSummary } from "./cost-analysis-summary";

describe("成本分析结论模型", () => {
  it("用总成本、最大项和环比结果收敛首屏关键信息", () => {
    const result = buildCostAnalysisSummary([
      { key: "goods", label: "采购", amount: 820.5, previousAmount: 700, delta: 120.5, deltaRate: 17.2 },
      { key: "ad", label: "投放", amount: 180, previousAmount: 260, delta: -80, deltaRate: -30.8 },
      { key: "rent", label: "房租", amount: 300, previousAmount: 300, delta: 0, deltaRate: 0 },
    ]);
    expect(result).toMatchObject({ totalCost: 1300.5, previousCost: 1260, delta: 40.5, deltaRate: 3.2 });
    expect(result.structure[0]).toMatchObject({ key: "goods", share: 63.1 });
    expect(result.priority).toMatchObject({ key: "goods", reason: "increase", delta: 120.5 });
  });

  it("没有上升项时，以最大成本项作为唯一优先处理入口", () => {
    const result = buildCostAnalysisSummary([
      { key: "materials", label: "耗材", amount: 480, previousAmount: 500, delta: -20, deltaRate: -4 },
      { key: "labor", label: "人工", amount: 300, previousAmount: 340, delta: -40, deltaRate: -11.8 },
    ]);
    expect(result.priority).toMatchObject({ key: "materials", reason: "largest", share: 61.5 });
  });

  it("在无成本数据时返回明确空结论，不虚构处理动作", () => {
    expect(buildCostAnalysisSummary([])).toMatchObject({ totalCost: 0, priority: null, structure: [] });
  });
});
