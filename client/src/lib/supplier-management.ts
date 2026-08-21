import type { Supplier } from "./cost-book";

export function groupSuppliers(input: { suppliers: Supplier[]; query: string; categoryLabels: Map<string, string> }) {
  const keyword = input.query.trim().toLowerCase();
  const visible = input.suppliers.filter((supplier) => !keyword || [supplier.name, supplier.contact, input.categoryLabels.get(supplier.categoryKey) || ""].some((value) => value.toLowerCase().includes(keyword)));
  return {
    own: visible.filter((supplier) => !supplier.industryIds.includes("shared")),
    shared: visible.filter((supplier) => supplier.industryIds.includes("shared")),
  };
}

export function updateSupplierMetadata(suppliers: Supplier[], id: string, input: Pick<Supplier, "name" | "contact" | "categoryKey"> & { shared: boolean }) {
  return suppliers.map((supplier) => supplier.id === id ? { ...supplier, ...input, industryIds: (input.shared ? Array.from(new Set([...supplier.industryIds.filter((industryId) => industryId !== "shared"), "shared"])) : supplier.industryIds.filter((industryId) => industryId !== "shared")) as Supplier["industryIds"] } : supplier);
}

export function removeSupplierMetadata(suppliers: Supplier[], id: string) {
  return suppliers.filter((supplier) => supplier.id !== id);
}
