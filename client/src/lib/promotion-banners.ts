export type PromotionTarget = "cards" | "orders" | "industry" | "notifications";

export type PromotionBanner = {
  eyebrow: string;
  title: string;
  copy: string;
  action: string;
  target: PromotionTarget;
  asset: string;
};

export const promotionBanners: PromotionBanner[] = [
  { eyebrow: "产品功能", title: "成本卡，一键算出保本价", copy: "材料、人工、渠道费统一核算", action: "去测算", target: "cards", asset: "/manus-storage/carousel-acrylic-costing-v3_149d4053.png" },
  { eyebrow: "智能定价", title: "价格与利润，提前算明白", copy: "拖动售价，实时复核每件贡献", action: "查看商品", target: "cards", asset: "/manus-storage/carousel-acrylic-pricing-v3_b828c120.png" },
  { eyebrow: "经营洞察", title: "关键波动，及时发现处理", copy: "成本、订单与现金流统一追踪", action: "查看提醒", target: "notifications", asset: "/manus-storage/carousel-acrylic-insight-v3_ed5d756e.png" },
  { eyebrow: "订单管理", title: "订单与退款，逐笔对清", copy: "收入、售后与成本快照同步核对", action: "查看订单", target: "orders", asset: "/manus-storage/carousel-acrylic-orders-v3_014e7f7d.png" },
  { eyebrow: "现金流", title: "现金流，早看早安心", copy: "把收支变化留在同一条经营主线", action: "查看提醒", target: "notifications", asset: "/manus-storage/carousel-acrylic-cashflow-v3_f05c9c25.png" },
];
