import { describe, expect, it } from "vitest";
import { buildHomeTimeRange, filterByHomeTimeRange } from "./home-time-range";

describe("首页经营主卡时间范围", () => {
  it("今天使用本地业务日及前一自然日进行比较", () => {
    expect(buildHomeTimeRange("2026-08-27", "today")).toMatchObject({
      startDate: "2026-08-27",
      endDate: "2026-08-27",
      previousStartDate: "2026-08-26",
      previousEndDate: "2026-08-26",
      comparisonLabel: "较昨日",
    });
  });

  it("本周从周一累计到业务日，并只与上周同期比较", () => {
    expect(buildHomeTimeRange("2026-08-27", "week")).toMatchObject({
      startDate: "2026-08-24",
      endDate: "2026-08-27",
      previousStartDate: "2026-08-17",
      previousEndDate: "2026-08-20",
      comparisonLabel: "较上周同期",
    });
  });

  it("本月使用月初至业务日，并在月末时将上月同期钳制到月末", () => {
    expect(buildHomeTimeRange("2026-03-31", "month")).toMatchObject({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      previousStartDate: "2026-02-01",
      previousEndDate: "2026-02-28",
      comparisonLabel: "较上月同期",
    });
  });

  it("仅筛选落在闭区间内的发生日，不把区间外订单或退款混入", () => {
    const range = buildHomeTimeRange("2026-08-27", "week");
    const items = [
      { occurredAt: "2026-08-23", id: "outside" },
      { occurredAt: "2026-08-24", id: "start" },
      { occurredAt: "2026-08-27", id: "end" },
      { occurredAt: "2026-08-28", id: "future" },
    ];
    expect(filterByHomeTimeRange(items, range).map((item) => item.id)).toEqual(["start", "end"]);
  });
});
