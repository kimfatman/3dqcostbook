import { describe, expect, it } from "vitest";
import { navigationSearch, popNavigationStack, readNavigationState } from "./navigation-state";

describe("移动端页面导航状态", () => {
  it("解析一级页面与核心二级页面的深链接", () => {
    expect(readNavigationState("?screen=orders")).toEqual({ tab: "orders", subPage: null });
    expect(readNavigationState("?screen=budget")).toEqual({ tab: "profile", subPage: "budget" });
    expect(readNavigationState("?screen=indirectCosts")).toEqual({ tab: "analysis", subPage: "indirectCosts" });
    expect(readNavigationState("?screen=profileSettings")).toEqual({ tab: "profile", subPage: "profileSettings" });
  });

  it("将页面状态序列化为稳定的可恢复地址", () => {
    expect(navigationSearch({ tab: "home", subPage: null })).toBe("");
    expect(navigationSearch({ tab: "profile", subPage: "profileSettings" })).toBe("?screen=profileSettings");
    expect(navigationSearch({ tab: "analysis", subPage: "indirectCosts" })).toBe("?screen=indirectCosts");
    expect(navigationSearch({ tab: "home", subPage: "records", recordContext: { filter: "expense", month: "2026-08", query: "包装", categoryKey: "packaging", skuId: "ecommerce-sku-1" } })).toBe("?screen=records&filter=expense&month=2026-08&q=%E5%8C%85%E8%A3%85&category=packaging&sku=ecommerce-sku-1");
  });

  it("恢复经营流水的筛选、月份和搜索上下文", () => {
    expect(readNavigationState("?screen=record&filter=expense&month=2026-08&q=%E5%8C%85%E8%A3%85&category=packaging&sku=ecommerce-sku-1")).toMatchObject({ tab: "home", subPage: "record", recordContext: { filter: "expense", month: "2026-08", query: "包装", categoryKey: "packaging", skuId: "ecommerce-sku-1" } });
  });

  it("浏览器回退仅弹出当前层级，保留上一级来源", () => {
    expect(popNavigationStack(["analysis", "records"])).toEqual(["analysis"]);
    expect(popNavigationStack(["analysis"])).toEqual([]);
    expect(popNavigationStack([])).toEqual([]);
  });

  it("忽略无效 screen，避免恢复到不可渲染页面", () => {
    expect(readNavigationState("?screen=unknown")).toEqual({ tab: "home", subPage: null });
  });
});
