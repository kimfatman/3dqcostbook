import type { IndustryTemplate } from "./cost-book";

const tabLabelByEntity: Record<string, string> = { 菜品: "菜品", 商品: "商品", 服务项目: "项目", 货品: "货品" };

export function costCardDisplayCopy(template: Pick<IndustryTemplate, "entityLabel" | "tabLabel" | "unitLabel">) {
  return {
    tabLabel: template.tabLabel || tabLabelByEntity[template.entityLabel] || "成本",
    title: `${template.entityLabel}成本`,
    description: `清晰掌握${template.entityLabel}成本变化，提升单${template.unitLabel}利润`,
    unitProfitLabel: `单${template.unitLabel}利润`,
    imageManagementCopy: `${template.entityLabel}图片仅在${template.entityLabel}成本详情中管理。`,
  };
}
