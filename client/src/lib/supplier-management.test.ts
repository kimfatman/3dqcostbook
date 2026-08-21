import { describe, expect, it } from "vitest";
import { groupSuppliers, removeSupplierMetadata, updateSupplierMetadata } from "./supplier-management";
import type { Supplier } from "./cost-book";

const supplier = (id: string, name: string, industryIds: Supplier["industryIds"], categoryKey = "goods"): Supplier => ({ id, workspaceId: "w", industryIds, name, contact: "陈经理", categoryKey, spend: 0, orders: 0, trend: "up" });

describe("供应商搜索与分组", () => {
  it("按名称、联系人或分类过滤，并将共享供应商与当前行业供应商分组", () => {
    const result = groupSuppliers({ suppliers: [supplier("a", "本地食材", ["canteen"]), supplier("b", "通用包材", ["ecommerce", "shared"], "pack")], query: "包材", categoryLabels: new Map([["goods", "采购"], ["pack", "包装"]]) });
    expect(result.own).toHaveLength(0);
    expect(result.shared.map((item) => item.name)).toEqual(["通用包材"]);
  });

  it("编辑或删除供应商只改变供应商目录，不改写既有流水或封存报表快照", () => {
    const directory = [supplier("a", "本地食材", ["canteen"]), supplier("b", "通用包材", ["ecommerce", "shared"], "pack")];
    const historicalEntries = [{ id: "entry-1", supplierId: "a", amountFen: 12800 }];
    const reportSnapshot = [{ key: "goods", amount: 128 }];
    const updated = updateSupplierMetadata(directory, "a", { name: "新食材", contact: "王经理", categoryKey: "goods", shared: true });
    expect(updated.find((item) => item.id === "a")).toMatchObject({ name: "新食材", industryIds: ["canteen", "shared"] });
    expect(historicalEntries).toEqual([{ id: "entry-1", supplierId: "a", amountFen: 12800 }]);
    expect(reportSnapshot).toEqual([{ key: "goods", amount: 128 }]);
    expect(removeSupplierMetadata(updated, "a").map((item) => item.id)).toEqual(["b"]);
    expect(historicalEntries[0].supplierId).toBe("a");
  });
});
