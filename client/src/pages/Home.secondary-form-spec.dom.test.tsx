// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

const trpcMocks = vi.hoisted(() => ({
  authData: undefined as any,
  workspaceData: undefined as any,
}));

vi.mock("@/lib/trpc", () => {
  const queryResult = (data: unknown = undefined) => ({
    data,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  const mutationResult = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
  return {
    trpc: {
      auth: {
        me: { useQuery: () => queryResult(trpcMocks.authData) },
        logout: { useMutation: mutationResult },
      },
      workspace: {
        list: { useQuery: () => queryResult(trpcMocks.workspaceData) },
        book: { useQuery: queryResult },
        saveBook: { useMutation: mutationResult },
        updateProfile: { useMutation: mutationResult },
      },
      profile: { updateMe: { useMutation: mutationResult } },
      useUtils: () => ({
        auth: { me: { invalidate: vi.fn(), refetch: vi.fn() } },
        workspace: { list: { invalidate: vi.fn(), refetch: vi.fn() } },
      }),
    },
  };
});

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  trpcMocks.authData = undefined;
  trpcMocks.workspaceData = undefined;
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

function mainNavigation() {
  return within(screen.getByRole("navigation", { name: "主导航" }));
}

function renderHome() {
  return render(
    <ThemeProvider defaultTheme="light" switchable>
      <Home />
    </ThemeProvider>
  );
}

async function openScreenDirectly(screenName: string) {
  window.history.replaceState({}, "", `/?screen=${screenName}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function expectFormSpec(form: HTMLElement) {
  expect(form.className).toContain("secondary-form");
  const actions = form.querySelector(".form-actions") as HTMLElement;
  expect(actions).toBeTruthy();
  const submit = actions.querySelector(
    ".fixed-primary.form-save"
  ) as HTMLButtonElement;
  expect(submit).toBeTruthy();
  expect(submit.getAttribute("type")).toBe("submit");
  return { actions, submit };
}

function expectCompactHeader(headingName: string) {
  const heading = screen.getByRole("heading", { name: headingName });
  const intro = heading.closest("section") as HTMLElement;
  expect(intro.className).toContain("sub-intro");
  expect(intro.className).toContain("compact");
  return heading;
}

describe("T6 二级表单统一规格", () => {
  it("供应商表单：sub-intro compact 页头、secondary-form 外壳、form-actions 提交区与既有保存路径", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("supplierForm");

    expectCompactHeader("新增供应商");
    const form = screen
      .getByRole("textbox", { name: "供应商名称" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("record-form");
    const { submit } = expectFormSpec(form);
    expect(within(submit).getByText("新增供应商")).toBeTruthy();

    // 跨行业整行复选（attachment-row）保留
    const sharedRow = screen
      .getByText("跨行业可用")
      .closest("label") as HTMLElement;
    expect(sharedRow.className).toContain("attachment-row");
    expect(sharedRow.querySelector('input[name="shared"]')).toBeTruthy();

    // 既有提交路径回归：保存后回到供应商列表并出现新供应商
    await user.type(
      screen.getByRole("textbox", { name: "供应商名称" }),
      "规格回归供应商"
    );
    await user.click(submit);
    expect(await screen.findByRole("heading", { name: "供应商" })).toBeTruthy();
    expect(screen.getByText("规格回归供应商")).toBeTruthy();
  });

  it("分类表单：统一规格类名存在，颜色选择保留，保存路径不破", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("categoryForm");

    expectCompactHeader("新增分类");
    const form = screen
      .getByRole("textbox", { name: "分类名称" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("record-form");
    const { submit } = expectFormSpec(form);

    // 分类颜色选择保留
    expect(screen.getByRole("combobox", { name: "分类颜色" })).toBeTruthy();

    await user.type(
      screen.getByRole("textbox", { name: "分类名称" }),
      "规格回归分类"
    );
    await user.click(submit);
    expect(
      await screen.findByRole("heading", { name: "分类管理" })
    ).toBeTruthy();
    expect(screen.getByText("规格回归分类")).toBeTruthy();
  });

  it("成本卡表单：动态材料行保留、提交区含次按钮、既有保存路径不破", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(mainNavigation().getByRole("button", { name: "商品" }));
    await user.click(
      screen.getAllByRole("button", { name: "新增商品成本卡" }).at(-1)!
    );

    expectCompactHeader("新增商品");
    const form = screen
      .getByRole("textbox", { name: "商品名称" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("record-form");
    const { actions, submit } = expectFormSpec(form);
    expect(within(submit).getByText(/创建商品成本卡与 SKU/)).toBeTruthy();

    // 动态材料行保留；次按钮为 form-secondary
    expect(screen.getByRole("button", { name: "新增材料" })).toBeTruthy();
    const cancel = within(actions).getByRole("button", { name: "取消并返回" });
    expect(cancel.className).toContain("form-secondary");
    expect(cancel.getAttribute("type")).toBe("button");

    // 既有保存路径：填名称、售价与材料金额后创建成功
    await user.type(
      screen.getByRole("textbox", { name: "商品名称" }),
      "规格回归成本卡"
    );
    await user.clear(screen.getByPlaceholderText("例如：68"));
    await user.type(screen.getByPlaceholderText("例如：68"), "99");
    await user.type(screen.getAllByPlaceholderText("0.00")[0], "30");
    await user.click(submit);
    expect(
      await screen.findByRole("heading", { name: "商品成本卡" })
    ).toBeTruthy();
    expect(screen.getByText("规格回归成本卡")).toBeTruthy();
  });

  it("BOM 表单：统一规格类名存在", async () => {
    renderHome();
    await openScreenDirectly("bomForm");

    expectCompactHeader("添加成本项");
    const form = screen
      .getByRole("textbox", { name: "成本项名称" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("record-form");
    const { submit } = expectFormSpec(form);
    expect(within(submit).getByText("加入并重算")).toBeTruthy();
  });

  it("间接成本分摊表单：统一规格类名存在，保存后出现在本月列表（提交路径不破）", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("indirectCosts");

    expect(
      await screen.findByRole("heading", { name: "间接费用项" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "新增间接费用项" })
    ).toBeTruthy();
    const form = screen
      .getByRole("textbox", { name: "备注名称" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("indirect-cost-form");
    const { submit } = expectFormSpec(form);
    expect(within(submit).getByText("保存并一键摊销")).toBeTruthy();

    // 摊销目标复选与既有控件保留
    expect(screen.getByRole("radio", { name: "一键摊销" })).toBeTruthy();
    expect(screen.getByText("怎么分给商品成本卡？")).toBeTruthy();
    expect(form.querySelector('select[name="allocationMethod"]')).toBeTruthy();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);

    // 既有保存路径：填金额与名称后入账，本月列表出现
    await user.type(
      screen.getByRole("spinbutton", { name: /本期金额/ }),
      "1200"
    );
    await user.type(
      screen.getByRole("textbox", { name: "备注名称" }),
      "规格间接费用"
    );
    await user.click(submit);
    expect(await screen.findByText("规格间接费用")).toBeTruthy();
    expect(screen.getAllByText("¥1,200.00").length).toBeGreaterThan(0);
  });

  it("预算编辑表单：统一规格类名存在，保存路径不破", async () => {
    const user = userEvent.setup();
    renderHome();
    await openScreenDirectly("budget");

    expect(
      await screen.findByRole("heading", { name: /预算管理/ })
    ).toBeTruthy();
    const form = screen
      .getByRole("spinbutton", { name: "调整后的月度预算金额" })
      .closest("form") as HTMLFormElement;
    expect(form.className).toContain("budget-form-card");
    const { submit } = expectFormSpec(form);
    expect(within(submit).getByText("保存预算并刷新预测")).toBeTruthy();

    await user.click(submit);
    expect(screen.getByText("月度预算已保存，预测已刷新")).toBeTruthy();
  });
});
