import { describe, expect, it } from "vitest";
import { formatMoneyCompact } from "./money-display";

describe("金额展示", () => {
  it("对所有金额保留两位小数且不向上或向下取整为整数", () => {
    expect(formatMoneyCompact(0)).toBe("¥0.00");
    expect(formatMoneyCompact(12_300.45)).toBe("¥12,300.45");
    expect(formatMoneyCompact(9_876_543.21)).toBe("¥9,876,543.21");
    expect(formatMoneyCompact(-125_000_000.5)).toBe("-¥125,000,000.50");
  });
});
