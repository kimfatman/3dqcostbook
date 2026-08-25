// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartTooltip } from "./ChartTooltip";

describe("ChartTooltip", () => {
  it("在键盘聚焦与点击时展示统一的图表说明", () => {
    render(<ChartTooltip label="当前试算" value="¥63.50 · ¥25.40" detail="按当前渠道费率计算。" />);
    const trigger = screen.getByRole("button", { name: "查看当前试算说明" });

    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip").textContent).toContain("¥63.50 · ¥25.40");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
