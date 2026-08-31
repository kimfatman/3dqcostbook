// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkinPreview } from "./SkinPreview";

afterEach(cleanup);

describe("SkinPreview 迷你工作台预览", () => {
  it("预览容器应用 skin-{id} class", () => {
    render(<SkinPreview skinId="midnight" />);
    const el = document.querySelector(".mobile-shell.skin-preview-shell") as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.classList.contains("skin-midnight")).toBe(true);
    expect(el.classList.contains("mobile-shell")).toBe(true);
  });

  it("自定义皮肤 overrides 注入预览容器 style 且标记自定义标签", () => {
    render(<SkinPreview skinId="soft" customOverrides={{ "--sdq-action-primary": "#ff0000" }} isCustom />);
    const el = document.querySelector(".skin-preview-shell") as HTMLElement;
    expect(el.style.getPropertyValue("--sdq-action-primary")).toBe("#ff0000");
    expect(document.querySelector(".skin-preview-tag")?.textContent).toContain("自定义");
  });

  it("预览包含经营概览/订单指标/商品卡/底部 Tab 栏四要素", () => {
    render(<SkinPreview skinId="soft" />);
    expect(document.querySelector(".skin-preview-overview")).toBeTruthy();
    expect(document.querySelectorAll(".skin-preview-metric")).toHaveLength(3);
    expect(document.querySelector(".skin-preview-product")).toBeTruthy();
    expect(document.querySelectorAll(".skin-preview-tab")).toHaveLength(5);
  });
});
