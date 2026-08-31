// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOM_SKINS_KEY } from "../skins";
import { SkinCenter } from "./SkinCenter";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
});

function renderCenter(props: Partial<Parameters<typeof SkinCenter>[0]> = {}) {
  const onApplyOfficial = vi.fn();
  const onApplyCustom = vi.fn();
  const utils = render(
    <SkinCenter
      visualSkin="soft"
      activeCustomSkin={null}
      onApplyOfficial={onApplyOfficial}
      onApplyCustom={onApplyCustom}
      onBack={vi.fn()}
      {...props}
    />
  );
  return { onApplyOfficial, onApplyCustom, ...utils };
}

async function createCustomSkin(name: string) {
  fireEvent.click(screen.getByRole("button", { name: /创建自定义皮肤/ }));
  const editor = await screen.findByRole("dialog");
  const nameInput = editor.querySelector(".skin-editor-field input") as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText(name);
}

describe("SkinCenter 皮肤中心页面", () => {
  it("渲染 5 个官方皮肤卡片与皮肤预览区", () => {
    renderCenter();
    expect(document.querySelectorAll(".skin-card")).toHaveLength(5);
    expect(document.querySelector('[data-testid="skin-preview"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "皮肤中心" })).toBeTruthy();
  });

  it("点击官方皮肤应用按钮触发 onApplyOfficial", () => {
    const { onApplyOfficial } = renderCenter();
    const forestCard = document.querySelector('.skin-card[data-skin-id="forest"]') as HTMLElement;
    fireEvent.click(forestCard.querySelector(".skin-card-apply") as HTMLElement);
    expect(onApplyOfficial).toHaveBeenCalledWith("forest");
  });

  it("创建自定义皮肤后持久化到 localStorage", async () => {
    renderCenter();
    await createCustomSkin("我的暖色");
    const saved = JSON.parse(window.localStorage.getItem(CUSTOM_SKINS_KEY) || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("我的暖色");
    expect(saved[0].overrides).toHaveProperty("--sdq-action-primary");
    // 官方 5 + 自定义 1
    expect(document.querySelectorAll(".skin-card")).toHaveLength(6);
  });

  it("应用自定义皮肤触发 onApplyCustom 并携带完整皮肤对象", async () => {
    const { onApplyCustom } = renderCenter();
    await createCustomSkin("我的蓝");
    const customCard = Array.from(document.querySelectorAll(".skin-card")).find((el) =>
      el.textContent?.includes("我的蓝")
    ) as HTMLElement;
    fireEvent.click(customCard.querySelector(".skin-card-apply") as HTMLElement);
    expect(onApplyCustom).toHaveBeenCalledTimes(1);
    expect(onApplyCustom.mock.calls[0][0].name).toBe("我的蓝");
    expect(onApplyCustom.mock.calls[0][0].baseSkin).toBe("soft");
  });

  it("高级设置开关切换 html class 并持久化", () => {
    renderCenter();
    const toggles = document.querySelectorAll(".skin-center-setting input[type=checkbox]");
    expect(toggles.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(toggles[1]); // 降低动效
    expect(document.documentElement.classList.contains("sdq-reduce-motion")).toBe(true);
    expect(window.localStorage.getItem("sdq-reduce-motion")).toBe("1");
    fireEvent.click(toggles[2]); // 大字体
    expect(document.documentElement.classList.contains("sdq-large-font")).toBe(true);
    expect(window.localStorage.getItem("sdq-large-font")).toBe("1");
  });

  it("删除自定义皮肤后从 localStorage 移除", async () => {
    renderCenter();
    await createCustomSkin("待删除");
    const customCard = Array.from(document.querySelectorAll(".skin-card")).find((el) =>
      el.textContent?.includes("待删除")
    ) as HTMLElement;
    const delBtn = customCard.querySelector('button[title="删除"]') as HTMLElement;
    fireEvent.click(delBtn);
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(CUSTOM_SKINS_KEY) || "[]");
      expect(saved).toHaveLength(0);
    });
    expect(document.querySelectorAll(".skin-card")).toHaveLength(5);
  });
});
