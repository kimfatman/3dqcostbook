import type { BookState, Category } from "./cost-book";
import type { LedgerEntry } from "./ledger-metrics";

export function updateCategoryMetadata(categories: Category[], id: string, input: Pick<Category, "label" | "color" | "hint">) {
  return categories.map((category) => category.id === id ? { ...category, ...input } : category);
}

export function canRemoveCategory(entries: LedgerEntry[], industryId: Category["industryId"], categoryKey: string) {
  return !entries.some((entry) => entry.industryId === industryId && entry.categoryKey === categoryKey);
}

type CategoryState = Pick<BookState, "categories" | "entries" | "closedReports">;

export function updateCategoryState<T extends CategoryState>(state: T, id: string, input: Pick<Category, "label" | "color" | "hint">): T {
  return { ...state, categories: updateCategoryMetadata(state.categories, id, input) };
}

export function removeCategoryState<T extends CategoryState>(state: T, industryId: Category["industryId"], id: string) {
  const category = state.categories.find((item) => item.id === id);
  if (!category) return { ok: false as const, reason: "分类不存在", state };
  if (!canRemoveCategory(state.entries, industryId, category.key)) return { ok: false as const, reason: "该分类下仍有关联流水，无法删除", state };
  return { ok: true as const, state: { ...state, categories: state.categories.filter((item) => item.id !== id) } as T };
}
