export type PriceSliderRange = { min: number; max: number };

const money = (value: number) => Number(value.toFixed(2));

export function buildPriceSliderRange(input: { suggestedPrice: number; breakEvenPrice?: number | null }): PriceSliderRange {
  const suggested = Math.max(0, input.suggestedPrice || 0);
  if (!suggested) return { min: 0.01, max: 10 };
  const breakEven = Math.max(0, input.breakEvenPrice || suggested);
  return {
    min: money(Math.max(0.01, Math.min(breakEven, suggested) * .6)),
    max: money(Math.max(10, suggested * 1.5, breakEven * 1.25)),
  };
}

export function clampSliderPrice(price: number | null, range: PriceSliderRange, fallback: number) {
  const candidate = Number.isFinite(price) && price !== null ? price : fallback;
  return money(Math.min(range.max, Math.max(range.min, candidate)));
}
