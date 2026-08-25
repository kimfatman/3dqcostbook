import { describe, expect, it } from "vitest";
import { buildPriceSliderRange, clampSliderPrice } from "./pricing-slider";

describe("智能定价滑块", () => {
  it("围绕保本价与建议价建立可拖动范围，并保留两位小数", () => {
    expect(buildPriceSliderRange({ suggestedPrice: 63.5, breakEvenPrice: 38.1 })).toEqual({ min: 22.86, max: 95.25 });
  });

  it("将拖动值限制在有效范围内，不改变两位小数价格口径", () => {
    const range = buildPriceSliderRange({ suggestedPrice: 45.91, breakEvenPrice: 29.12 });
    expect(clampSliderPrice(45.919999999, range, 45.91)).toBe(45.92);
    expect(clampSliderPrice(-1, range, 45.91)).toBe(range.min);
    expect(clampSliderPrice(null, range, 45.91)).toBe(45.91);
  });
});
