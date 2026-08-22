import { describe, expect, it } from "vitest";
import { buildHiddenCostEstimates } from "./hidden-costs";

describe("行业隐形成本估算", () => {
  it("只使用当前期间已入账的收入与指定成本分类作为基数", () => {
    const estimates = buildHiddenCostEstimates({
      rules: [
        { key: "refund", label: "退款漏损", rate: .05, basisKeys: ["revenue"], tip: "核对退款" },
        { key: "ad", label: "无效投放", rate: .12, basisKeys: ["ad_spend"], tip: "核对投产" },
        { key: "mixed", label: "组合基数", rate: .1, basisKeys: ["revenue", "ad_spend"], tip: "核对组合" },
      ],
      revenue: 7050,
      categoryAmounts: [{ key: "ad_spend", amount: 1200 }, { key: "goods_purchase", amount: 3000 }],
    });
    expect(estimates.map((item) => [item.key, item.base, item.estimate, item.source])).toEqual([
      ["refund", 7050, 353, "benchmark"],
      ["ad", 1200, 144, "benchmark"],
      ["mixed", 8250, 825, "benchmark"],
    ]);
  });

  it("没有可用收入或成本基数时返回零估算，而不虚构账务数据", () => {
    const [estimate] = buildHiddenCostEstimates({ rules: [{ key: "inventory", label: "库存占用", rate: .02, basisKeys: ["goods_purchase"], tip: "补录采购" }], revenue: 0, categoryAmounts: [] });
    expect(estimate).toMatchObject({ base: 0, estimate: 0, source: "benchmark" });
  });
});
