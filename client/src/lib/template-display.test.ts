import { describe, expect, it } from "vitest";
import { industryTemplates, type IndustryId } from "./cost-book";
import { costCardDisplayCopy, templatePageDisplayAudit } from "./template-display";

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

  it("让首页、订单、成本卡、SKU、资料、预算和分析页统一读取当前行业的实体、单位和分类", () => {
    (Object.keys(industryTemplates) as IndustryId[]).forEach(id => {
      const template = industryTemplates[id];
      const audit = templatePageDisplayAudit(template);

      expect(audit.home.industryLabel).toBe(template.label);
      expect(audit.order).toMatchObject({ entityLabel: template.entityLabel, unitLabel: template.unitLabel, skuTechnicalLabel: "SKU" });
      expect(audit.cards).toMatchObject({ title: `${template.entityLabel}成本`, formulaLabel: template.formulaLabel });
      expect(audit.sku).toMatchObject({ title: `SKU ${template.entityLabel}成本`, unitLabel: template.unitLabel });
      expect(audit.profile.imageLabel).toBe(`${template.entityLabel}图片`);
      expect(audit.budget.categoryLabels).toEqual(template.categories.map(category => category.label));
      expect(audit.analysis.categoryLabels).toEqual(template.categories.map(category => category.label));
    });
  });
});
