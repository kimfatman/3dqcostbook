import { describe, expect, it } from "vitest";
import { calcCard, type CostCard } from "./cost-book";

const card: CostCard = {
  id: "card-1",
  workspaceId: "w",
  industryId: "ecommerce",
  name: "收纳盒",
  kind: "平台 SKU",
  unit: "件",
  salePrice: 68,
  labor: 3.2,
  overhead: 4.1,
  items: [{ id: "bom-1", name: "货品采购", spec: "单件", quantity: "1 件", amount: 20 }, { id: "bom-2", name: "包材", spec: "单件", quantity: "1 件", amount: 5.6 }],
  history: [],
  status: "healthy",
};

describe("成本卡单位成本与毛利", () => {
  it("新增成本卡会以物料、人工和固定分摊共同计算单位成本", () => {
    expect(calcCard(card)).toEqual({ material: 25.6, cost: 32.9, marginRate: 51.6 });
  });

  it("编辑 BOM 或分摊后可重算后续 SKU 所需的单位成本", () => {
    const edited = { ...card, labor: 4.2, items: card.items.map((item) => item.id === "bom-2" ? { ...item, amount: 7.8 } : item) };
    expect(calcCard(edited)).toEqual({ material: 27.8, cost: 36.1, marginRate: 46.9 });
  });
});
