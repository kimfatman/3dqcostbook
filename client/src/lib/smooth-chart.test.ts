import { describe, expect, it } from "vitest";
import { buildSmoothLinePoints } from "./smooth-chart";

describe("buildSmoothLinePoints", () => {
  it("保留真实首尾采样点并在中间插入平滑坐标", () => {
    const path = buildSmoothLinePoints([{ x: 4, y: 48 }, { x: 48, y: 18 }, { x: 96, y: 34 }], 4);
    const coordinates = path.split(" ");

    expect(coordinates[0]).toBe("4,48");
    expect(coordinates.at(-1)).toBe("96,34");
    expect(coordinates).toHaveLength(9);
  });

  it("对空数据和单点数据保持可预测输出", () => {
    expect(buildSmoothLinePoints([])).toBe("");
    expect(buildSmoothLinePoints([{ x: 20, y: 30 }])).toBe("20,30");
  });
});
