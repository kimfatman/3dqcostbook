import { describe, expect, it } from "vitest";
import { availableMonths, matchesMonth, matchesQuery } from "./list-search";

describe("账本列表筛选", () => {
  it("按自然月匹配日期，并支持全部月份", () => {
    expect(matchesMonth("2026-07-14", "2026-07")).toBe(true);
    expect(matchesMonth("2026-06-14", "2026-07")).toBe(false);
    expect(matchesMonth("2026-06-14", "all")).toBe(true);
  });

  it("提取并按倒序去重可用月份", () => {
    expect(availableMonths(["2026-06-01", "2026-07-14", "2026-06-28"])).toEqual(["2026-07", "2026-06"]);
  });

  it("按关键词匹配订单或流水的任意可检索字段", () => {
    expect(matchesQuery(["PDD-001", "张女士", "轻盈收纳盒"], "张女")).toBe(true);
    expect(matchesQuery(["PDD-001", "轻盈收纳盒"], "pdd")).toBe(true);
    expect(matchesQuery(["平台佣金", "服务结算"], "  ")).toBe(true);
    expect(matchesQuery(["平台佣金", "服务结算"], "退款")).toBe(false);
  });
});
