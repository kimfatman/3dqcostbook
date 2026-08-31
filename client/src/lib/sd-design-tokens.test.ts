// @vitest-environment node
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const srcDir = join(import.meta.dirname, "..");
const cssFiles = ["index.css", "cashflow-filter.css", "layout-unification.css", "widescreen-c7.css"];
const tokenFile = join(srcDir, "sd-design-tokens.css");

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("SDQ 设计令牌一致性（批次6 令牌收敛）", () => {
  it("组件 CSS 无硬编码十六进制颜色（排除令牌定义文件）", () => {
    const hex = /#[0-9a-fA-F]{3,8}/g;
    const offenders: string[] = [];
    for (const f of cssFiles) {
      const content = stripComments(readFileSync(join(srcDir, f), "utf8"));
      const hits = content.match(hex) ?? [];
      if (hits.length > 0) offenders.push(`${f}: ${hits.length} 处`);
    }
    expect(offenders).toEqual([]);
  });

  it("所有引用的 --sdq-* 语义令牌均有定义", () => {
    const tokenContent = readFileSync(tokenFile, "utf8");
    const defined = new Set(
      [...tokenContent.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
    );
    const missing = new Set<string>();
    for (const f of cssFiles) {
      const content = readFileSync(join(srcDir, f), "utf8");
      for (const m of content.matchAll(/var\((--sdq-[a-z0-9-]+)/g)) {
        if (!defined.has(m[1])) missing.add(`${f}: ${m[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("深色皮肤 skin-deep 令牌齐全（覆盖浅色全部颜色类语义令牌）", () => {
    const tokenContent = readFileSync(tokenFile, "utf8");
    const rootBlock = tokenContent.match(/:root \{[^}]*\}/ms)?.[0] ?? "";
    const deepBlock = tokenContent.match(/\.mobile-shell\.skin-deep \{[^}]*\}/ms)?.[0] ?? "";
    const rootNames = new Set(
      [...rootBlock.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
    );
    const deepNames = new Set(
      [...deepBlock.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
    );
    // 颜色类令牌在深色皮肤下必须显式覆盖（非颜色令牌如 radius/space 可继承）
    const colorLike = /-(bg-|text-|border-|action-|income|cost|profit|risk|info|icon-|shadow-|overlay-)/;
    const missingInDeep = [...rootNames]
      .filter((n) => !/\-\d+$/.test(n))
      .filter((n) => colorLike.test(n))
      .filter((n) => !deepNames.has(n));
    expect(missingInDeep).toEqual([]);
  });
});
