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

  it("成本回冲会降低净成本，但不会扭曲正向成本结构占比", () => {
    const result = buildCostAnalysisSummary([
      { key: "goods", label: "采购", amount: 100, previousAmount: 90, delta: 10, deltaRate: 11.1 },
      { key: "ad", label: "投放", amount: 20, previousAmount: 0, delta: 20, deltaRate: null },
      { key: "returns", label: "成本回冲", amount: -5, previousAmount: 0, delta: -5, deltaRate: null },
    ]);
    expect(result).toMatchObject({ totalCost: 115, previousCost: 90, grossCost: 120, costCredits: 5, delta: 25 });
    expect(result.structure.map((item) => [item.key, item.share])).toEqual([["goods", 83.3], ["ad", 16.7]]);
  });

  it("即使环比增幅最大的分类不在前五成本项内，也会进入优先处理", () => {
    const result = buildCostAnalysisSummary([
      { key: "a", label: "A", amount: 100, previousAmount: 100, delta: 0, deltaRate: 0 },
      { key: "b", label: "B", amount: 90, previousAmount: 90, delta: 0, deltaRate: 0 },
      { key: "c", label: "C", amount: 80, previousAmount: 80, delta: 0, deltaRate: 0 },
      { key: "d", label: "D", amount: 70, previousAmount: 70, delta: 0, deltaRate: 0 },
      { key: "e", label: "E", amount: 60, previousAmount: 60, delta: 0, deltaRate: 0 },
      { key: "f", label: "F", amount: 50, previousAmount: 1, delta: 49, deltaRate: 4900 },
    ]);
    expect(result.structure).toHaveLength(5);
    expect(result.priority).toMatchObject({ key: "f", reason: "increase", delta: 49 });
  });
});
