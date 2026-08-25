import type { PriceSliderRange } from "./pricing-slider";
import { buildSmoothLinePoints, type SmoothChartPoint } from "./smooth-chart";

export type PricingProfitPoint = {
  price: number;
  contribution: number;
  margin: number;
  isCurrent: boolean;
};

export type PricingProfitTrend = {
  points: PricingProfitPoint[];
  current: PricingProfitPoint | null;
};

export type PricingProfitCurveCoordinate = SmoothChartPoint;

const money = (value: number) => {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(value) + 1e-9) * 100) / 100;
};
const uniquePriceKey = (value: number) => Math.round(value * 100);

function makePoint(price: number, unitCost: number, platformRatePct: number, fulfillmentCost: number, currentPrice: number): PricingProfitPoint {
  const contribution = money(price * (1 - platformRatePct / 100) - unitCost - fulfillmentCost);
  return {
    price: money(price),
    contribution,
    margin: price > 0 ? Number((contribution / price * 100).toFixed(1)) : 0,
    isCurrent: uniquePriceKey(price) === uniquePriceKey(currentPrice),
  };
}

/**
 * 在定价滑块的实际可调范围中取固定数量的价格点，并强制纳入当前试算价。
 * 这使折线图和滑块始终使用同一价格边界与同一两位小数利润口径。
 */
export function buildPricingProfitTrend(input: {
  range: PriceSliderRange;
  unitCost: number;
  platformRatePct: number;
  fulfillmentCost: number;
  currentPrice: number;
  sampleCount?: number;
}): PricingProfitTrend {
  const { range, unitCost, platformRatePct, fulfillmentCost } = input;
  const canRender = [range.min, range.max, unitCost, platformRatePct, fulfillmentCost, input.currentPrice].every(Number.isFinite)
    && range.min > 0
    && range.max >= range.min
    && unitCost >= 0
    && fulfillmentCost >= 0
    && platformRatePct >= 0
    && platformRatePct < 100;
  if (!canRender) return { points: [], current: null };

  const sampleCount = Math.min(41, Math.max(5, Math.round(input.sampleCount || 21)));
  const currentPrice = money(Math.min(range.max, Math.max(range.min, input.currentPrice)));
  const prices = Array.from({ length: sampleCount }, (_, index) => money(range.min + (range.max - range.min) * index / (sampleCount - 1)));
  prices.push(currentPrice);

  const points = Array.from(new Map(prices.map((price) => [uniquePriceKey(price), price])).values())
    .sort((left, right) => left - right)
    .map((price) => makePoint(price, unitCost, platformRatePct, fulfillmentCost, currentPrice));
  return { points, current: points.find((point) => point.isCurrent) || null };
}

/**
 * 在已有真实采样点之间插入 Catmull–Rom 曲线插值点。
 * 结果仍是 SVG polyline 坐标，因而不会影响现有的当前价、保本价和建议价标记；
 * 仅将视觉连线从折角收敛为柔和曲线。
 */
export function buildSmoothPricingProfitPolyline(points: PricingProfitCurveCoordinate[], stepsPerSegment = 7): string {
  return buildSmoothLinePoints(points, stepsPerSegment);
}
