import { describe, expect, it } from "vitest";
import { businessDate, businessPeriod } from "./business-date";
import { validateBomAmountInput, validateChannelPricingInput, validateHealthSettingsInput } from "./p1-validation";

describe("P1 输入边界", () => {
  it("将健康度阈值限制为有限的 0–100%", () => {
    expect(validateHealthSettingsInput({ targetOperatingMarginPct: 100, refundTolerancePct: 0 }).ok).toBe(true);
    expect(validateHealthSettingsInput({ targetOperatingMarginPct: 101, refundTolerancePct: 0 }).ok).toBe(false);
    expect(validateHealthSettingsInput({ targetOperatingMarginPct: Number.NaN, refundTolerancePct: 0 }).ok).toBe(false);
  });

  it("拒绝使智能定价分母失效的渠道模板", () => {
    expect(validateChannelPricingInput({ commissionRatePct: 5, fulfillmentCost: 3.5, targetContributionMarginPct: 40, roundingStep: 1 }).ok).toBe(true);
    expect(validateChannelPricingInput({ commissionRatePct: 60, fulfillmentCost: 3.5, targetContributionMarginPct: 40, roundingStep: 1 }).ok).toBe(false);
    expect(validateChannelPricingInput({ commissionRatePct: 101, fulfillmentCost: 3.5, targetContributionMarginPct: 0, roundingStep: 1 }).ok).toBe(false);
  });

  it("拒绝零、负数和非有限 BOM 金额", () => {
    expect(validateBomAmountInput({ name: "包装", quantity: "1 个", amount: 0 }).ok).toBe(false);
    expect(validateBomAmountInput({ name: "包装", quantity: "1 个", amount: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(validateBomAmountInput({ name: "包装", quantity: "1 个", amount: 2.5 }).ok).toBe(true);
  });

  it("使用本地业务日期而非 UTC 固定账期", () => {
    const instant = new Date("2026-08-01T00:30:00.000Z");
    expect(businessDate(instant, -480)).toBe("2026-08-01");
    expect(businessDate(instant, 120)).toBe("2026-07-31");
    expect(businessPeriod(instant, -480)).toBe("2026-08");
  });
});
