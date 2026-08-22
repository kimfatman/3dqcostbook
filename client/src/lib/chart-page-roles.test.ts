import { describe, expect, it } from "vitest";
import { chartPageRoles, chartRole } from "./chart-page-roles";

describe("chart page roles", () => {
  it("keeps the home page to a single trend entry rather than analytical diagnostics", () => {
    expect(chartRole("home").primary).toBe("经营结果与单一趋势入口");
    expect(chartPageRoles.home.allowed).toContain("经营趋势");
    expect(chartPageRoles.home.excluded).toEqual(expect.arrayContaining(["现金流收支", "预算燃尽"]));
  });

  it("assigns profit, trend and cost causes to analysis while reserving budget burn for budget", () => {
    expect(chartPageRoles.analysis.allowed).toEqual(["利润瀑布", "收入与成本趋势", "成本变化排行"]);
    expect(chartPageRoles.analysis.excluded).toEqual(expect.arrayContaining(["预算燃尽", "经营健康度"]));
    expect(chartPageRoles.budget.allowed).toEqual(["预算环", "预算燃尽趋势"]);
  });
});
