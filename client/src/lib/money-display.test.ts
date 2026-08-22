import { describe, expect, it } from "vitest";
import { formatMoneyCompact } from "./money-display";

describe("移动端金额展示", () => {
  it("在首页有限宽度中将万元和亿元数值压缩为完整可读的金额", () => {
    expect(formatMoneyCompact(0)).toBe("¥0");
    expect(formatMoneyCompact(12_300)).toBe("¥1.2万");
    expect(formatMoneyCompact(9_876_543)).toBe("¥987.7万");
    expect(formatMoneyCompact(-125_000_000)).toBe("-¥1.3亿");
  });
});
