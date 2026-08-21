/**
 * 移动账本表单数值编辑态：允许用户在输入过程中暂时清空，
 * 仅在提交计算或保存前将其规范化为业务数值。
 */
export type EditableNumber = number | "";

export function toEditableNumber(raw: string): EditableNumber {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : "";
}

export function toNumber(value: EditableNumber) {
  return value === "" ? 0 : value;
}

export function isPositiveInteger(value: EditableNumber) {
  return value !== "" && Number.isInteger(value) && value > 0;
}

export function isPositiveMoney(value: EditableNumber) {
  return value !== "" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeNumber(value: EditableNumber) {
  return value !== "" && Number.isFinite(value) && value >= 0;
}
