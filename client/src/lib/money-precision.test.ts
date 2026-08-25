import { describe, expect, it } from "vitest";
import { fromFen, toFen } from "./ledger-metrics";
import { quotePrice } from "./pricing";

describe("业务金额两位小数精度", () => {
  it("以分为最小存储单位，保留已输入的两位小数并抑制浮点表达误差", () => {
    expect(toFen(10.23)).toBe(1023);
    expect(toFen(0.1 + 0.2)).toBe(30);
    expect(fromFen(1023)).toBe(10.23);
  });

  it("定价直接保留两位小数，不按 0.1、0.5、1 或 5 元步长改变价格", () => {
    const quote = quotePrice({ unitCost: 24.8, platformRatePct: 6, fulfillmentCost: 1.37, targetContributionMarginPct: 37 });
    expect(quote).toMatchObject({ available: true, rawPrice: 45.91, price: 45.91 });
  });
});
