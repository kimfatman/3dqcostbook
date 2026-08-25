import { describe, expect, it } from "vitest";
import { promotionBanners } from "./promotion-banners";

describe("产品宣传轮播", () => {
  it("保留五页具备独立素材和可达动作的宣传内容", () => {
    expect(promotionBanners).toHaveLength(5);
    expect(new Set(promotionBanners.map((banner) => banner.title)).size).toBe(5);
    expect(new Set(promotionBanners.map((banner) => banner.asset)).size).toBe(5);
    expect(promotionBanners.every((banner) => banner.asset.startsWith("/manus-storage/") && banner.action.length > 0)).toBe(true);
  });
});
