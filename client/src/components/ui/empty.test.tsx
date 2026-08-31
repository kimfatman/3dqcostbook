// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty";

afterEach(() => {
  cleanup();
});

describe("EmptyState 三段式空态", () => {
  it("渲染图标、标题、描述与可选行动按钮", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<span data-testid="empty-icon-mark" />}
        title="暂无数据"
        description="录入第一笔记录后自动生成"
        action={{ label: "去记账", onClick }}
      />
    );

    expect(screen.getByText("暂无数据")).toBeTruthy();
    expect(screen.getByText("录入第一笔记录后自动生成")).toBeTruthy();
    expect(screen.getByRole("button", { name: "去记账" })).toBeTruthy();
    expect(screen.getByTestId("empty-icon-mark")).toBeTruthy();
  });

  it("点击行动按钮触发回调", () => {
    const onClick = vi.fn();
    render(<EmptyState title="空" action={{ label: "去记账", onClick }} />);

    fireEvent.click(screen.getByRole("button", { name: "去记账" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("图标、描述与行动按钮均为可选项，不渲染多余节点", () => {
    render(<EmptyState title="仅标题" />);

    expect(screen.getByText("仅标题")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("录入第一笔记录后自动生成")).toBeNull();
  });
});
