import type { IndustryTemplate } from "./cost-book";

const tabLabelByEntity: Record<string, string> = { 菜品: "菜品", 商品: "商品", 服务项目: "项目", 货品: "货品" };
const costCardTitleByEntity: Record<string, string> = { 菜品: "菜品成本卡", 商品: "商品成本卡", 服务项目: "服务项目成本卡", 货品: "货品成本卡" };

export function costCardDisplayCopy(template: Pick<IndustryTemplate, "entityLabel" | "tabLabel" | "unitLabel">) {
  const title = costCardTitleByEntity[template.entityLabel] || `${template.entityLabel}成本卡`;
  return {
    tabLabel: template.tabLabel || tabLabelByEntity[template.entityLabel] || "成本",
    title,
    description: `管理${title}的成本与定价，提升单${template.unitLabel}利润`,
    unitProfitLabel: `单${template.unitLabel}利润`,
    imageManagementCopy: `${template.entityLabel}图片仅在${title}详情中管理。`,
  };
}

/**
 * 汇集各一级业务页面应从模板读取的显示数据，供回归测试和逐页审计共用。
 * 页面中仍保留的 SKU 是技术标识；业务实体名称由 entityLabel 提供。
 */
export function templatePageDisplayAudit(template: IndustryTemplate) {
  const costCard = costCardDisplayCopy(template);
  return {
    home: { industryLabel: template.label, cardsTabLabel: costCard.tabLabel },
    order: { entityLabel: template.entityLabel, unitLabel: template.unitLabel, skuTechnicalLabel: "SKU" },
    cards: { ...costCard, formulaLabel: template.formulaLabel },
    sku: { title: `SKU ${costCard.title}`, unitLabel: template.unitLabel },
    profile: { imageLabel: `${template.entityLabel}图片` },
    budget: { industryLabel: template.label, categoryLabels: template.categories.map(category => category.label) },
    analysis: { industryLabel: template.label, categoryLabels: template.categories.map(category => category.label) },
  };
}
