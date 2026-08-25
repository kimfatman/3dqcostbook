import { describe, expect, it } from "vitest";
import { breakEvenPrice, quotePrice } from "./pricing";

describe("智能定价", () => {
  it("按平台费率、履约费用与目标贡献毛利率反推售价，并直接保留两位小数", () => {
    expect(quotePrice({ unitCost: 24.8, platformRatePct: 6, fulfillmentCost: 1.37, targetContributionMarginPct: 37 })).toMatchObject({ available: true, rawPrice: 45.91, price: 45.91 });
  });

  it("可计算扣除平台费率后的保本价", () => {
    expect(breakEvenPrice(30, 5, 3)).toMatchObject({ available: true, price: 34.74, contributionMarginPct: 0 });
  });

  it("拒绝平台费率与目标毛利率之和达到或超过 100% 的无效目标", () => {
    expect(quotePrice({ unitCost: 30, platformRatePct: 60, fulfillmentCost: 0, targetContributionMarginPct: 40 })).toMatchObject({ available: false });
  });
});
