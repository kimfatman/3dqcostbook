import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "client/src/cashflow-filter.css"), "utf8");

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
});
