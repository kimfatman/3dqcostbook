import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokensCss = readFileSync(resolve(process.cwd(), "client/src/sd-design-tokens.css"), "utf8");
const indexCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("C1 令牌系统化：原色阶原语", () => {
  it("品牌蓝 11 阶齐全且为指定 hex", () => {
    expect(tokensCss).toContain("--sdq-blue-50: #f3f5f6");
    expect(tokensCss).toContain("--sdq-blue-100: #e5ebf0");
    expect(tokensCss).toContain("--sdq-blue-200: #bfd6ee");
    expect(tokensCss).toContain("--sdq-blue-300: #86bdf3");
    expect(tokensCss).toContain("--sdq-blue-400: #439ef9");
    expect(tokensCss).toContain("--sdq-blue-500: #0880f7");
    expect(tokensCss).toContain("--sdq-blue-600: #056dd4");
    expect(tokensCss).toContain("--sdq-blue-700: #0861ba");
    expect(tokensCss).toContain("--sdq-blue-800: #0e4f90");
    expect(tokensCss).toContain("--sdq-blue-900: #15406b");
    expect(tokensCss).toContain("--sdq-blue-950: #152b42");
  });

  it("中性灰 11 阶齐全且为指定 hex", () => {
    expect(tokensCss).toContain("--sdq-neutral-50: #f5f7fa");
    expect(tokensCss).toContain("--sdq-neutral-100: #ebf0f4");
    expect(tokensCss).toContain("--sdq-neutral-200: #d9e0e8");
    expect(tokensCss).toContain("--sdq-neutral-300: #bcc6d2");
    expect(tokensCss).toContain("--sdq-neutral-400: #8f9dae");
    expect(tokensCss).toContain("--sdq-neutral-500: #697a8c");
    expect(tokensCss).toContain("--sdq-neutral-600: #576575");
    expect(tokensCss).toContain("--sdq-neutral-700: #45515f");
    expect(tokensCss).toContain("--sdq-neutral-800: #333d47");
    expect(tokensCss).toContain("--sdq-neutral-900: #212830");
    expect(tokensCss).toContain("--sdq-neutral-950: #14191f");
  });

  it("语义色 mini 阶（success/warning/danger/info 500+600）齐全", () => {
    expect(tokensCss).toContain("--sdq-success-500: #20a779");
    expect(tokensCss).toContain("--sdq-success-600: #1b8f68");
    expect(tokensCss).toContain("--sdq-warning-500: #f6a623");
    expect(tokensCss).toContain("--sdq-warning-600: #d98d12");
    expect(tokensCss).toContain("--sdq-danger-500: #e8534f");
    expect(tokensCss).toContain("--sdq-danger-600: #d43f3b");
    expect(tokensCss).toContain("--sdq-info-500: #5acbfa");
    expect(tokensCss).toContain("--sdq-info-600: #3cb4ec");
  });
});

describe("C1 令牌系统化：语义层重指向原色阶", () => {
  it("浅色默认皮肤语义令牌指向原色阶 var() 引用", () => {
    expect(tokensCss).toContain("--sdq-bg-canvas: var(--sdq-neutral-50)");
    expect(tokensCss).toContain("--sdq-bg-brand: var(--sdq-blue-500)");
    expect(tokensCss).toContain("--sdq-action-primary: var(--sdq-blue-500)");
    expect(tokensCss).toContain("--sdq-action-primary-pressed: var(--sdq-blue-600)");
    expect(tokensCss).toContain("--sdq-text-primary: var(--sdq-neutral-900)");
    expect(tokensCss).toContain("--sdq-text-secondary: var(--sdq-neutral-600)");
    expect(tokensCss).toContain("--sdq-text-tertiary: var(--sdq-neutral-400)");
    expect(tokensCss).toContain("--sdq-border-subtle: var(--sdq-neutral-100)");
    expect(tokensCss).toContain("--sdq-border-strong: var(--sdq-neutral-300)");
    expect(tokensCss).toContain("--sdq-icon-default: var(--sdq-neutral-400)");
    expect(tokensCss).toContain("--sdq-icon-disabled: var(--sdq-neutral-200)");
    expect(tokensCss).toContain("--sdq-income: var(--sdq-blue-500)");
    expect(tokensCss).toContain("--sdq-profit: var(--sdq-success-500)");
    expect(tokensCss).toContain("--sdq-cost: var(--sdq-warning-500)");
    expect(tokensCss).toContain("--sdq-risk: var(--sdq-danger-500)");
    expect(tokensCss).toContain("--sdq-info: var(--sdq-info-500)");
  });

  it("skin-deep 深色皮肤同理重指向原色阶（Δ≤25 才改，bg-surface 保留原值）", () => {
    expect(tokensCss).toContain("--sdq-bg-canvas: var(--sdq-neutral-950)");
    expect(tokensCss).toContain("--sdq-bg-surface: #151f31");
    expect(tokensCss).toContain("--sdq-bg-brand: var(--sdq-blue-400)");
    expect(tokensCss).toContain("--sdq-action-primary: var(--sdq-blue-400)");
    expect(tokensCss).toContain("--sdq-action-primary-pressed: var(--sdq-blue-500)");
    expect(tokensCss).toContain("--sdq-text-primary: var(--sdq-neutral-50)");
    expect(tokensCss).toContain("--sdq-text-secondary: var(--sdq-neutral-300)");
    expect(tokensCss).toContain("--sdq-text-tertiary: var(--sdq-neutral-400)");
    expect(tokensCss).toContain("--sdq-border-subtle: var(--sdq-neutral-800)");
    expect(tokensCss).toContain("--sdq-border-strong: var(--sdq-neutral-600)");
    expect(tokensCss).toContain("--sdq-icon-default: var(--sdq-neutral-400)");
    expect(tokensCss).toContain("--sdq-icon-disabled: var(--sdq-neutral-600)");
    expect(tokensCss).toContain("--sdq-income: var(--sdq-blue-400)");
    expect(tokensCss).toContain("--sdq-cost: var(--sdq-warning-500)");
    expect(tokensCss).toContain("--sdq-profit: var(--sdq-success-500)");
    expect(tokensCss).toContain("--sdq-risk: var(--sdq-danger-500)");
    expect(tokensCss).toContain("--sdq-info: var(--sdq-info-500)");
  });

  it("三皮肤令牌齐全：默认浅色、skin-deep、skin-aurora 入口均存在", () => {
    expect(tokensCss).toContain(":root {");
    expect(tokensCss).toContain(".mobile-shell.skin-deep");
    expect(tokensCss).toContain(".mobile-shell.skin-aurora");
  });
});

describe("C1 令牌系统化：Tailwind v4 @theme 桥", () => {
  it("令牌层末尾声明 @theme，关键令牌暴露为工具类色", () => {
    expect(tokensCss).toContain("@theme {");
    expect(tokensCss).toContain("--color-brand-500: var(--sdq-blue-500)");
    expect(tokensCss).toContain("--color-brand-600: var(--sdq-blue-600)");
    expect(tokensCss).toContain("--color-ink: var(--sdq-text-primary)");
    expect(tokensCss).toContain("--color-muted: var(--sdq-text-secondary)");
    expect(tokensCss).toContain("--color-surface: var(--sdq-bg-surface)");
    expect(tokensCss).toContain("--color-canvas: var(--sdq-bg-canvas)");
    expect(tokensCss).toContain("--color-profit: var(--sdq-profit)");
    expect(tokensCss).toContain("--color-cost: var(--sdq-cost)");
    expect(tokensCss).toContain("--color-risk: var(--sdq-risk)");
  });

  it("index.css 入口在 @import 之后镜像同内容，工具类名不重复定义冲突值", () => {
    expect(indexCss).toContain("@theme {");
    expect(indexCss).toContain("--color-brand-500: var(--sdq-blue-500)");
    expect(indexCss).toContain("--color-risk: var(--sdq-risk)");
  });
});
