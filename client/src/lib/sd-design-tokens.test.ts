// @vitest-environment node
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { SKIN_REGISTRY } from "../skins";

const srcDir = join(import.meta.dirname, "..");
const tokensDir = join(srcDir, "tokens");
const skinsDir = join(srcDir, "skins");

const cssFiles = ["index.css", "cashflow-filter.css", "layout-unification.css", "widescreen-c7.css"];
const tokenFiles = ["primitives.css", "semantic.css", "tailwind-bridge.css"].map((f) =>
  join(tokensDir, f)
);
const skinFiles = ["soft.css", "deep.css", "aurora.css", "midnight.css", "forest.css"].map((f) =>
  join(skinsDir, f)
);

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectDefinedTokens() {
  const defined = new Set<string>();
  for (const f of [...tokenFiles, ...skinFiles]) {
    const content = readFileSync(f, "utf8");
    for (const m of content.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)) {
      defined.add(m[1]);
    }
  }
  return defined;
}

describe("SDQ 设计令牌一致性（批次6 令牌收敛 + 批次7 拆分）", () => {
  it("组件 CSS 无硬编码十六进制颜色（排除令牌/皮肤定义文件）", () => {
    const hex = /#[0-9a-fA-F]{3,8}/g;
    const offenders: string[] = [];
    for (const f of cssFiles) {
      const content = stripComments(readFileSync(join(srcDir, f), "utf8"));
      const hits = content.match(hex) ?? [];
      if (hits.length > 0) offenders.push(`${f}: ${hits.length} 处`);
    }
    expect(offenders).toEqual([]);
  });

  it("所有引用的 --sdq-* 语义令牌在 tokens/ 或 skins/ 中均有定义", () => {
    const defined = collectDefinedTokens();
    const missing = new Set<string>();
    for (const f of cssFiles) {
      const content = readFileSync(join(srcDir, f), "utf8");
      for (const m of content.matchAll(/var\((--sdq-[a-z0-9-]+)/g)) {
        if (!defined.has(m[1])) missing.add(`${f}: ${m[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("深层皮肤（deep/midnight）令牌齐全（覆盖浅色全部颜色类语义令牌）", () => {
    const semanticBlock =
      readFileSync(join(tokensDir, "semantic.css"), "utf8").match(/:root \{[^}]*\}/ms)?.[0] ?? "";
    const rootNames = new Set(
      [...semanticBlock.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
    );
    const colorLike = /-(bg-|text-|border-|action-|income|cost|profit|risk|info|icon-|shadow-|overlay-)/;
    const expected = [...rootNames]
      .filter((n) => !/-\d+$/.test(n))
      .filter((n) => colorLike.test(n));

    for (const skin of ["deep", "midnight"]) {
      const block =
        readFileSync(join(skinsDir, `${skin}.css`), "utf8").match(
          new RegExp(`\\.mobile-shell\\.skin-${skin} \\{[^}]*\\}`, "ms")
        )?.[0] ?? "";
      const skinNames = new Set(
        [...block.matchAll(/(--sdq-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
      );
      const missingInSkin = expected.filter((n) => !skinNames.has(n));
      expect(missingInSkin, `${skin} 缺失: ${missingInSkin.join(", ")}`).toEqual([]);
    }
  });

  it("皮肤注册表包含 5 种官方皮肤且元数据完整", () => {
    expect(SKIN_REGISTRY).toHaveLength(5);
    const ids = SKIN_REGISTRY.map((s) => s.id);
    expect(ids).toEqual(["soft", "deep", "aurora", "midnight", "forest"]);
    for (const skin of SKIN_REGISTRY) {
      expect(skin.name.length).toBeGreaterThan(0);
      expect(skin.description.length).toBeGreaterThan(0);
      expect(["light", "dark"]).toContain(skin.mode);
      const pc = skin.previewColors;
      expect(pc.primary.length).toBeGreaterThan(0);
      expect(pc.background.length).toBeGreaterThan(0);
      expect(pc.surface.length).toBeGreaterThan(0);
      expect(pc.text.length).toBeGreaterThan(0);
    }
  });

  it("sd-design-tokens.css 已拆分为只 import（tokens/ 3 文件 + skins/ 5 皮肤 + 注册表）", () => {
    const entry = readFileSync(join(srcDir, "sd-design-tokens.css"), "utf8");
    const imports = [...entry.matchAll(/@import "(\.\/[^"]+)"/g)].map((m) => m[1]);
    expect(imports).toEqual([
      "./tokens/primitives.css",
      "./tokens/semantic.css",
      "./tokens/tailwind-bridge.css",
      "./skins/soft.css",
      "./skins/deep.css",
      "./skins/aurora.css",
      "./skins/midnight.css",
      "./skins/forest.css",
    ]);
    // 入口文件不再包含令牌定义（已移出）
    expect(entry).not.toContain("--sdq-action-primary:");
  });

  it("midnight 为纯黑深色、forest 为绿色品牌，关键令牌符合定义", () => {
    const midnight = readFileSync(join(skinsDir, "midnight.css"), "utf8");
    expect(midnight).toContain("--sdq-bg-canvas: #000000");
    expect(midnight).toContain("--sdq-bg-surface: #111111");
    const forest = readFileSync(join(skinsDir, "forest.css"), "utf8");
    expect(forest).toContain("--sdq-action-primary: #17805e");
    expect(forest).toContain("--sdq-profit: #20a779");
  });

  /* ============ 批次10：WCAG AA 对比度验证 ============ */
  function hexToLuminance(hex: string): number {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contrastRatio(a: string, b: string): number {
    const la = hexToLuminance(a);
    const lb = hexToLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }
  function buildTokenMap() {
    const primitives = new Map<string, string>();
    for (const m of readFileSync(join(tokensDir, "primitives.css"), "utf8").matchAll(/(--sdq-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      primitives.set(m[1], m[2].trim());
    }
    const resolve = (value: string, local: Map<string, string>): string => {
      const m = value.match(/^var\((--sdq-[a-z0-9-]+)\)$/);
      if (!m) return value;
      const v = local.has(m[1]) ? local.get(m[1]) : primitives.get(m[1]);
      if (v === undefined) return value;
      return /^var\(/.test(v) ? resolve(v, local) : v;
    };
    const semantic = new Map<string, string>();
    const root = readFileSync(join(tokensDir, "semantic.css"), "utf8").match(/:root \{[^}]*\}/ms)?.[0] ?? "";
    for (const m of root.matchAll(/(--sdq-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      semantic.set(m[1], resolve(m[2].trim(), semantic));
    }
    const skins: Record<string, Map<string, string>> = {};
    for (const id of ["soft", "deep"]) {
      const block =
        readFileSync(join(skinsDir, `${id}.css`), "utf8").match(
          new RegExp(`\\.mobile-shell\\.skin-${id} \\{[^}]*\\}`, "ms")
        )?.[0] ?? "";
      const local = new Map(semantic);
      for (const m of block.matchAll(/(--sdq-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
        local.set(m[1], resolve(m[2].trim(), local));
      }
      skins[id] = local;
    }
    return skins;
  }

  it("批次10：soft/deep 关键令牌组合对比度达到 WCAG AA", () => {
    const maps = buildTokenMap();
    const combos = [
      { fg: "--sdq-text-primary", bg: "--sdq-bg-canvas", min: 7, name: "正文" },
      { fg: "--sdq-text-secondary", bg: "--sdq-bg-canvas", min: 4.5, name: "次级正文" },
      { fg: "--sdq-text-tertiary", bg: "--sdq-bg-canvas", min: 3, name: "辅助文字" },
      { fg: "--sdq-action-primary", bg: "--sdq-bg-surface", min: 4.5, name: "交互主色" },
      { fg: "--sdq-text-on-brand", bg: "--sdq-action-primary", min: 4.5, name: "按钮文字" },
      { fg: "--sdq-profit", bg: "--sdq-bg-surface", min: 3, name: "利润" },
      { fg: "--sdq-cost", bg: "--sdq-bg-surface", min: 3, name: "成本" },
      { fg: "--sdq-risk", bg: "--sdq-bg-surface", min: 3, name: "风险" },
      { fg: "--sdq-info", bg: "--sdq-bg-surface", min: 3, name: "信息" },
    ];
    for (const [id, map] of Object.entries(maps)) {
      for (const c of combos) {
        const fg = map.get(c.fg) ?? "";
        const bg = map.get(c.bg) ?? "";
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${id} 皮肤 ${c.name}(${fg} on ${bg}) 对比度 ${ratio.toFixed(2)} 需 ≥${c.min}`).toBeGreaterThanOrEqual(c.min);
      }
    }
  });
});
