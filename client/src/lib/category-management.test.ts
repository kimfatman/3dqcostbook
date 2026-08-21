import { describe, expect, it } from "vitest";
import { canRemoveCategory, removeCategoryState, updateCategoryMetadata, updateCategoryState } from "./category-management";
import type { BookState, Category } from "./cost-book";

describe("分类目录编辑", () => {
  it("更新分类名称、颜色和提示只改变分类目录，不改写历史流水分类键", () => {
    const categories: Category[] = [{ id: "cat-1", workspaceId: "w", industryId: "ecommerce", key: "goods", label: "采购", color: "#1677FF", hint: "采购成本", ledgerRole: "cogs" }];
    const historicalEntries = [{ id: "entry-1", categoryKey: "goods", amountFen: 12800 }];
    const closedReports = [{ id: "r-1", snapshot: [{ key: "goods", label: "采购", amount: 128, pct: 100 }] }];
    const state = { categories, entries: historicalEntries, closedReports } as unknown as Pick<BookState, "categories" | "entries" | "closedReports">;
    const updated = updateCategoryState(state, "cat-1", { label: "货品采购", color: "#12B76A", hint: "含到货与关税" });
    expect(updated.categories[0]).toMatchObject({ key: "goods", label: "货品采购", color: "#12B76A", hint: "含到货与关税" });
    expect(updated.entries).toBe(state.entries);
    expect(updated.closedReports).toBe(state.closedReports);
    expect(updated.closedReports[0].snapshot[0].label).toBe("采购");
  });

  it("当前行业已有流水占用时拒绝删除分类，其他行业同名分类不构成阻塞", () => {
    const entries = [{ id: "e-1", workspaceId: "w", industryId: "retail", occurredAt: "2026-08-01", createdAt: "now", updatedAt: "now", eventType: "expense", ledgerRole: "opex", cashDirection: "outflow", amountFen: 100, categoryKey: "goods", merchant: "供应商", note: "", status: "posted" }] as never[];
    expect(canRemoveCategory(entries, "ecommerce", "goods")).toBe(true);
    expect(canRemoveCategory(entries, "retail", "goods")).toBe(false);
  });

  it("被当前行业流水占用的分类删除失败时，目录、流水和封存报表均保持原引用", () => {
    const categories: Category[] = [{ id: "cat-1", workspaceId: "w", industryId: "ecommerce", key: "goods", label: "采购", color: "#1677FF", hint: "采购成本", ledgerRole: "cogs" }];
    const state = { categories, entries: [{ industryId: "ecommerce", categoryKey: "goods" }], closedReports: [{ id: "r-1", snapshot: [{ key: "goods", label: "采购" }] }] } as unknown as Pick<BookState, "categories" | "entries" | "closedReports">;
    const result = removeCategoryState(state, "ecommerce", "cat-1");
    expect(result).toMatchObject({ ok: false, reason: "该分类下仍有关联流水，无法删除" });
    expect(result.state).toBe(state);
    expect(result.state.closedReports).toBe(state.closedReports);
  });
});
