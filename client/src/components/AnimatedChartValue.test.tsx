// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatedChartValue } from "./AnimatedChartValue";

describe("AnimatedChartValue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("在减少动效偏好下直接显示新值，同时暴露最终格式化值", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const format = (value: number) => `¥${value.toFixed(2)}`;
    const { rerender } = render(<AnimatedChartValue value={18.5} format={format} />);

    expect(screen.getByLabelText("¥18.50").textContent).toBe("¥18.50");
    rerender(<AnimatedChartValue value={26.75} format={format} />);

    expect(screen.getByLabelText("¥26.75").textContent).toBe("¥26.75");
  });
});
