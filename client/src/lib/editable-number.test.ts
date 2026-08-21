import { describe, expect, it } from "vitest";
import { isNonNegativeNumber, isPositiveInteger, isPositiveMoney, toEditableNumber, toNumber } from "./editable-number";

describe("可空数值编辑态", () => {
  it("允许用户清空数值输入，再继续输入新的数值", () => {
    expect(toEditableNumber("")).toBe("");
    expect(toEditableNumber("12.5")).toBe(12.5);
    expect(toEditableNumber(" ")).toBe("");
  });

  it("只在提交时将空值规范为零，并保持正数金额校验", () => {
    expect(toNumber("")).toBe(0);
    expect(isPositiveMoney("")).toBe(false);
    expect(isPositiveMoney(0)).toBe(false);
    expect(isPositiveMoney(0.01)).toBe(true);
  });

  it("订单数量必须为正整数，避免清空时回弹为一", () => {
    expect(isPositiveInteger("")).toBe(false);
    expect(isPositiveInteger(0.5)).toBe(false);
    expect(isPositiveInteger(1)).toBe(true);
    expect(isNonNegativeNumber(0)).toBe(true);
  });
});
