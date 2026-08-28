import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brandAssetList, brandAssetManifestPath, brandAssets, brandAssetsByKind } from "./brand-assets";

describe("算得清品牌资产索引", () => {
  it("覆盖设计包全部 15 个视觉 PNG，并校验 1 个资产清单 JSON", () => {
    expect(brandAssetList).toHaveLength(15);
    for (const item of brandAssetList) {
      expect(item.path.startsWith("/brand-assets/")).toBe(true);
      expect(item.usage.length).toBeGreaterThan(0);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(existsSync(resolve(process.cwd(), "client/public", decodeURIComponent(item.path.slice(1))))).toBe(true);
    }
    expect(existsSync(resolve(process.cwd(), "client/public", brandAssetManifestPath.slice(1)))).toBe(true);
  });

  it("按场景区分品牌参考与运营宣传资产", () => {
    expect(brandAssetsByKind("brand").map((item) => item.id)).toEqual(["vi_master_board", "splash_blue"]);
    expect(brandAssetsByKind("ui-reference")).toHaveLength(2);
    expect(brandAssetsByKind("app-store")).toHaveLength(5);
    expect(brandAssetsByKind("moments")).toHaveLength(5);
    expect(brandAssetsByKind("wechat")).toHaveLength(1);
    expect(brandAssets.splashBlue.path).toContain("SDQ_Splash_Blue.png");
  });
});
