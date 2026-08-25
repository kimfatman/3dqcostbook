import { describe, expect, it } from "vitest";
import { industryTemplates, type IndustryId } from "./cost-book";
import { costCardDisplayCopy } from "./template-display";

describe("行业模板成本卡显示名称", () => {
  it("为五类行业提供与实体名称一致的成本卡页面与底部导航名称", () => {
    const expected: Record<IndustryId, { tabLabel: string; title: string }> = {
      canteen: { tabLabel: "菜品", title: "菜品成本", unitProfitLabel: "单份利润" },
      retail: { tabLabel: "商品", title: "商品成本", unitProfitLabel: "单件利润" },
      ecommerce: { tabLabel: "商品", title: "商品成本", unitProfitLabel: "单件利润" },
      beauty: { tabLabel: "项目", title: "服务项目成本", unitProfitLabel: "单次利润" },
      stall: { tabLabel: "货品", title: "货品成本", unitProfitLabel: "单件利润" },
    };

    (Object.keys(industryTemplates) as IndustryId[]).forEach(id => {
      expect(costCardDisplayCopy(industryTemplates[id])).toMatchObject(expected[id]);
    });
  });
});
