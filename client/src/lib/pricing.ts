/**
 * 成本卡智能定价：目标为“扣除平台费率与单件履约费用后的贡献毛利率”。
 * 价格 = (单位完全成本 + 单件履约费用) / (1 - 平台费率 - 目标贡献毛利率)。
 * 所有价格直接按两位小数表达，不采用商业向上或向下取整步长。
 */
export type PricingInput = {
  unitCost: number;
  platformRatePct: number;
  fulfillmentCost: number;
  targetContributionMarginPct: number;
};

export type PriceQuote = {
  available: boolean;
  reason?: string;
  rawPrice: number;
  price: number;
  contributionPerUnit: number;
  contributionMarginPct: number;
};

const money = (value: number) => Number(value.toFixed(2));

export function quotePrice(input: PricingInput): PriceQuote {
  const unitCost = Math.max(0, input.unitCost || 0);
  const platformRate = Math.max(0, input.platformRatePct || 0) / 100;
  const fulfillmentCost = Math.max(0, input.fulfillmentCost || 0);
  const targetRate = Math.max(0, input.targetContributionMarginPct || 0) / 100;
  const denominator = 1 - platformRate - targetRate;
  if (denominator <= 0) return { available: false, reason: "平台费率与目标贡献毛利率之和必须小于 100%", rawPrice: 0, price: 0, contributionPerUnit: 0, contributionMarginPct: 0 };
  const rawPrice = (unitCost + fulfillmentCost) / denominator;
  const price = money(rawPrice);
  const contributionPerUnit = money(price * (1 - platformRate) - unitCost - fulfillmentCost);
  const contributionMarginPct = price > 0 ? Number((contributionPerUnit / price * 100).toFixed(1)) : 0;
  return { available: true, rawPrice: money(rawPrice), price, contributionPerUnit, contributionMarginPct };
}

export function breakEvenPrice(unitCost: number, platformRatePct: number, fulfillmentCost: number): PriceQuote {
  return quotePrice({ unitCost, platformRatePct, fulfillmentCost, targetContributionMarginPct: 0 });
}
