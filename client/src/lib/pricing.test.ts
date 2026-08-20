import { describe, expect, it } from "vitest";
import { breakEvenPrice, quotePrice } from "./pricing";

describe("智能定价", () => {
  it("按平台费率、履约费用与目标贡献毛利率反推并向上取整售价", () => {
    expect(quotePrice({ unitCost: 30, platformRatePct: 5, fulfillmentCost: 3, targetContributionMarginPct: 40, roundingStep: 1 })).toMatchObject({ available: true, rawPrice: 60, price: 60, contributionMarginPct: 40 });
  });

  it("可计算扣除平台费率后的保本价", () => {
    expect(breakEvenPrice(30, 5, 3, 1)).toMatchObject({ available: true, price: 35, contributionMarginPct: 0.7 });
  });

  it("拒绝平台费率与目标毛利率之和达到或超过 100% 的无效目标", () => {
    expect(quotePrice({ unitCost: 30, platformRatePct: 60, fulfillmentCost: 0, targetContributionMarginPct: 40, roundingStep: 1 })).toMatchObject({ available: false });
  });
});
