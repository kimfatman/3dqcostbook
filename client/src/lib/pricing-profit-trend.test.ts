import { describe, expect, it } from "vitest";
import { buildPricingProfitTrend, buildSmoothPricingProfitPolyline } from "./pricing-profit-trend";

describe("智能定价利润趋势", () => {
  it("在滑块实际价格范围内采样单件贡献，并保留两位小数口径", () => {
    const trend = buildPricingProfitTrend({
      range: { min: 22.86, max: 95.25 },
      unitCost: 30,
      platformRatePct: 5,
      fulfillmentCost: 1,
      currentPrice: 50.55,
      sampleCount: 5,
    });

    expect(trend.points.map((point) => point.price)).toEqual([22.86, 40.96, 50.55, 59.06, 77.15, 95.25]);
    expect(trend.current).toMatchObject({ price: 50.55, contribution: 17.02, margin: 33.7, isCurrent: true });
  });

  it("即使当前拖动价不落在均匀采样点上，也会作为高亮点插入折线", () => {
    const trend = buildPricingProfitTrend({
      range: { min: 10, max: 50 },
      unitCost: 15,
      platformRatePct: 0,
      fulfillmentCost: 0,
      currentPrice: 23.45,
      sampleCount: 5,
    });

    expect(trend.points).toHaveLength(6);
    expect(trend.points.filter((point) => point.isCurrent)).toEqual([{ price: 23.45, contribution: 8.45, margin: 36, isCurrent: true }]);
  });

  it("在缺少有效定价输入时不生成伪趋势", () => {
    expect(buildPricingProfitTrend({
      range: { min: 10, max: 50 },
      unitCost: 15,
      platformRatePct: 100,
      fulfillmentCost: 0,
      currentPrice: 23.45,
    })).toEqual({ points: [], current: null });
  });

  it("将真实采样坐标连接为不改写端点的柔和曲线坐标", () => {
    const polyline = buildSmoothPricingProfitPolyline([
      { x: 4, y: 56 },
      { x: 50, y: 32 },
      { x: 96, y: 8 },
    ]);

    expect(polyline).toMatch(/^4,56 /);
    expect(polyline.trim().split(" ").length).toBeGreaterThan(3);
    expect(polyline).toMatch(/96,8$/);
  });
});
