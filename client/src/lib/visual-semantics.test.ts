import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "client/src/cashflow-filter.css"), "utf8");
const baseCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
const accessGate = readFileSync(resolve(process.cwd(), "client/src/components/SelfHostedAccessGate.tsx"), "utf8");

describe("第二批全站视觉语义", () => {
  it("为收益、亏损、预警、中性与辅助信息定义跨皮肤令牌", () => {
    expect(css).toContain("--semantic-positive:");
    expect(css).toContain("--semantic-negative:");
    expect(css).toContain("--semantic-warning:");
    expect(css).toContain("--semantic-neutral:");
    expect(css).toContain("--semantic-muted:");
    expect(css).toContain(".dark, .skin-deep");
  });

  it("将语义、辅助文字和键盘焦点应用于账本页面壳而非单一页面", () => {
    expect(css).toContain(".ledger-page-shell .positive");
    expect(css).toContain(".ledger-page-shell .negative");
    expect(css).toContain(".ledger-page-shell .attention");
    expect(css).toContain(".ledger-page-shell .neutral");
    expect(css).toContain(".ledger-page-shell :is(.ledger-surface, .ledger-row-list, .record-form, .notification-list, .profile-page, .sub-intro, .appearance-settings) :is(em, small)");
    expect(css).toContain(".ledger-page-shell :is(button, input, select, textarea, summary):focus-visible");
  });

  it("让纵向金额、数量和百分比使用统一的等宽金融数字", () => {
    expect(baseCss).toContain("font-variant-numeric: tabular-nums lining-nums");
    expect(css).toContain(".home-sales-target .sales-target-stats b");
    expect(css).toContain(".report-breakdown > span > em");
    expect(css).toContain(".detail-hero > p");
  });

  it("为密集目标卡、空状态和店铺身份保留可读间距与完整文本策略", () => {
    expect(css).toContain(".home-sales-target .sales-target-stats");
    expect(css).toContain(".home-chart-empty p, .home-chart-empty small");
    expect(css).toContain(".brand-mini strong, .dashboard-kicker > span > b, .profile-identity-meta > span:last-child");
    expect(css).toContain("white-space: normal");
    expect(css).toContain("text-overflow: clip");
  });

  it("P2 核心模块使用 SDQ 语义令牌和移动端触控尺寸", () => {
    expect(readFileSync(resolve(process.cwd(), "client/src/tokens/semantic.css"), "utf8")).toContain("--sdq-action-primary:");
    expect(baseCss).toContain(".record-filter > button.active");
    expect(baseCss).toContain(".record-row > strong.income");
    expect(baseCss).toContain(".prototype-products .product-cost-list > button");
    expect(baseCss).toContain(".supplier-list > div:not(.empty-state)");
    expect(baseCss).toContain("min-height: var(--sdq-height-control)");
    expect(baseCss).toContain(".app-content :where(.fixed-primary, .floating-add, .sales-baseline-primary, .list-primary, .form-save)");
    expect(baseCss).toContain("border-radius: var(--sdq-radius-sm)");
  });

  it("使用中文可见上传控件和字段级校验，不触发英文浏览器原生提示", () => {
    expect(css).toContain(".identity-inline-upload input[type=\"file\"], .identity-upload input[type=\"file\"]");
    expect(css).toContain("content: \"选择图片\"");
    expect(accessGate).toContain("noValidate");
    expect(accessGate).toContain("请输入正确的邮箱地址");
    expect(accessGate).toContain("密码至少需要 8 个字符");
  });
});
