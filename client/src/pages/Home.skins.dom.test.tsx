// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function openAppearance() {
  window.history.replaceState({}, "", "/?screen=appearance");
  window.dispatchEvent(new PopStateEvent("popstate"));
  await screen.findByRole("heading", { name: /皮肤中心/ });
}

function shell() {
  return document.querySelector(".mobile-shell") as HTMLElement;
}

function skinCards() {
  return Array.from(document.querySelectorAll(".skin-card"));
}

function applySkinCard(id: string) {
  const card = document.querySelector(`.skin-card[data-skin-id="${id}"]`) as HTMLElement;
  fireEvent.click(card.querySelector(".skin-card-apply") as HTMLElement);
}

describe("批次8 皮肤切换机制（统一切换 + 5 种皮肤 + 持久化）", () => {
  it("根组件默认应用 skin-soft class（默认皮肤 soft）", () => {
    renderHome();
    expect(shell().className).toContain("mobile-shell");
    expect(shell().className).toContain("skin-soft");
  });

  it("皮肤中心展示 5 种官方皮肤，点击午夜黑应用后根组件切换到 skin-midnight", async () => {
    renderHome();
    await openAppearance();
    expect(skinCards()).toHaveLength(5);
    applySkinCard("midnight");
    await waitFor(() => expect(shell().className).toContain("skin-midnight"));
    expect(shell().className).not.toContain("skin-soft");
  });

  it("切换森林绿后持久化到 localStorage，重新加载仍保持 skin-forest", async () => {
    renderHome();
    await openAppearance();
    applySkinCard("forest");
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("sqd-mobile-book-v3") || "{}");
      expect(saved.workspace?.visualSkin).toBe("forest");
    });
  });
});
