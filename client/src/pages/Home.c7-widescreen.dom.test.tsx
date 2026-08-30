// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

const trpcMocks = vi.hoisted(() => ({
  authData: undefined as any,
  workspaceData: undefined as any,
}));

vi.mock("@/lib/trpc", () => {
  const queryResult = (data: unknown = undefined) => ({ data, error: null, isLoading: false, refetch: vi.fn() });
  const mutationResult = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    trpc: {
      auth: { me: { useQuery: () => queryResult(trpcMocks.authData) }, logout: { useMutation: mutationResult } },
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

function renderHome() {
  return render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
}

/** 与既有回归一致：URL + popstate 导航（jsdom 不算布局，只断言类名与 CSS 规则存在）。 */
async function openScreen(screenName: string, heading: RegExp | string) {
  window.history.replaceState({}, "", `/?screen=${screenName}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findByRole("heading", { name: heading });
}

function main() {
  return document.querySelector("main") as HTMLElement;
}

function shell() {
  return document.querySelector(".mobile-shell") as HTMLElement;
}

describe("C7 宽屏策略：壳居中标记 + 分析/流水受控双列", () => {
  it("壳常驻 c7-shell-center 标记；工作台常规页不带 c7-expandable", async () => {
    renderHome();
    expect(shell().className).toContain("mobile-shell");
    expect(shell().className).toContain("c7-shell-center");
    expect(main().className).toContain("app-content");
    expect(main().className).not.toContain("c7-expandable");
  });

  it("洞察根页（analysis tab）主内容带 c7-expandable，允许壳内 860px 受控双列", async () => {
    renderHome();
    await openScreen("analysis", /经营洞察/);
    expect(shell().className).toContain("c7-shell-center");
    expect(main().className).toContain("app-content");
    expect(main().className).toContain("c7-expandable");
  });

  it("经营流水子页（records）主内容带 c7-expandable", async () => {
    renderHome();
    await openScreen("records", "收入、成本，逐笔算清");
    expect(main().className).toContain("app-content sub-content");
    expect(main().className).toContain("c7-expandable");
  });

  it("洞察/流水下的次级页（如经营报表）不继承 c7-expandable，避免表单/详情被拉宽", async () => {
    renderHome();
    await openScreen("reports", "经营报表");
    expect(main().className).toContain("app-content sub-content");
    expect(main().className).not.toContain("c7-expandable");
  });

  it("CSS 规则存在：≥768 壳居中 520px、color-mix 加深画布、分析/流水 860px 平滑过渡", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/widescreen-c7.css"), "utf8");
    // 断点沿用现有 media query 风格
    expect(css).toContain("@media (min-width: 768px)");
    // 壳居中 + 最大 520px（覆盖旧 760px/1080px 拉伸），tabbar 同步
    expect(css).toContain(".c7-shell-center .app-frame,");
    expect(css).toContain(".c7-shell-center .tabbar");
    expect(css).toContain("width: min(100%, 520px);");
    // 画布加深：color-mix 仅引用语义令牌，不新增色值
    expect(css).toContain("color-mix(in srgb, var(--sdq-bg-canvas) 90%, var(--sdq-neutral-950));");
    // 分析/流水受控双列：860px 上限 + 随视口平滑过渡（不强制 grid 重排）
    expect(css).toContain(".c7-shell-center:has(.c7-expandable) .app-frame");
    expect(css).toContain("width: min(calc(100% - 48px), 860px);");
    // 顶部品牌位与移动端表现不受影响：规则只在 min-width: 768px 生效
    expect(css.match(/@media \(min-width: 768px\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
