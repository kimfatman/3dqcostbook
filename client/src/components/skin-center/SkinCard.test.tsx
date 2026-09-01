// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SKIN_REGISTRY } from "../../skins";
import { SkinCard } from "./SkinCard";

afterEach(cleanup);

describe("SkinCard 皮肤卡片", () => {
  const skin = SKIN_REGISTRY[0]; // soft 清蓝

  it("渲染 4 色预览条与名称/模式标签", () => {
    render(<SkinCard skin={skin} isActive={false} onPreview={vi.fn()} onApply={vi.fn()} />);
    const swatches = document.querySelectorAll(".skin-card-swatches i");
    expect(swatches).toHaveLength(4);
    const hex = skin.previewColors.primary.slice(1);
    const rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    expect((swatches[0] as HTMLElement).style.background).toBe(rgb);
    expect(screen.getByText("清蓝")).toBeTruthy();
    expect(screen.getByText("浅色")).toBeTruthy();
  });

  it("未应用时显示应用按钮可点击触发 onApply；点击预览条触发 onPreview", () => {
    const onApply = vi.fn();
    const onPreview = vi.fn();
    render(<SkinCard skin={skin} isActive={false} onPreview={onPreview} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "应用" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "预览清蓝" }));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it("已应用显示禁用态；自定义皮肤显示编辑/复制/导出/删除操作", () => {
    const { rerender } = render(<SkinCard skin={skin} isActive onPreview={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: /已应用/ }).hasAttribute("disabled")).toBe(true);
    rerender(
      <SkinCard
        skin={skin}
        isActive={false}
        isCustom
        onPreview={vi.fn()}
        onApply={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByLabelText("编辑清蓝")).toBeTruthy();
    expect(screen.getByLabelText("复制清蓝")).toBeTruthy();
    expect(screen.getByLabelText("导出清蓝")).toBeTruthy();
    expect(screen.getByLabelText("删除清蓝")).toBeTruthy();
  });
});
