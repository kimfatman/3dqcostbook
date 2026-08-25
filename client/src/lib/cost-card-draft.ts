import type { EditableNumber } from "./editable-number";

export type DraftMaterial = { id: string; name: string; spec: string; quantity: string; amount: EditableNumber };
type DraftMaterialSeed = Partial<DraftMaterial>;

function draftId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `draft-material-${crypto.randomUUID()}`
    : `draft-material-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 草稿 ID 只服务 React 行稳定性，不会写入成本卡 BOM。 */
export function createDraftMaterial(unitLabel: string, seed: DraftMaterialSeed = {}): DraftMaterial {
  return {
    id: seed.id || draftId(),
    name: seed.name ?? "",
    spec: seed.spec ?? "",
    quantity: seed.quantity ?? `1 ${unitLabel}`,
    amount: seed.amount ?? "",
  };
}

export function updateDraftMaterial(materials: DraftMaterial[], id: string, patch: Partial<Omit<DraftMaterial, "id">>) {
  return materials.map(material => material.id === id ? { ...material, ...patch } : material);
}

export function removeDraftMaterial(materials: DraftMaterial[], id: string) {
  return materials.filter(material => material.id !== id);
}
