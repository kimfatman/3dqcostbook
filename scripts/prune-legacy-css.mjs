import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const rootDir = process.cwd();
const target = path.join(rootDir, "client/src/index.css");
const apply = process.argv.includes("--apply");
const normalizeVisuals = process.argv.includes("--normalize-visuals");
const removeDeadBackgroundSize = process.argv.includes("--remove-dead-background-size");
const reportVisualAssets = process.argv.includes("--report-visual-assets");
const removeSuppressedPseudo = process.argv.includes("--remove-suppressed-pseudo");

const unusedComponentClasses = new Set([
  "summary-card",
  "summary-head",
  "summary-main",
  "summary-grid",
  "quick-grid",
  "quick-icon",
  "category-card",
  "category-cell",
  "category-dot",
  "category-info",
  "risk-card",
  "risk-symbol",
  "section-block",
  "hidden-cost-card",
  "analysis-hero",
  "metric-strip",
  "promotion-motion-control",
  "home-cost-trend",
  "home-data-row",
  "profile-ledger",
  "profit-bridge",
  "mini-trend-card",
  "mini-bars",
]);

const css = fs.readFileSync(target, "utf8");
const stylesheet = postcss.parse(css, { from: target });
const removedSelectors = [];
const normalizedDeclarations = [];
const removedBackgroundSizes = [];
const visualAssets = [];
const removedSuppressedPseudo = [];

const selectorHasUnusedComponent = (selector) =>
  [...unusedComponentClasses].some((className) => selector.includes(`.${className}`));

stylesheet.walkRules((rule) => {
  if (!rule.selectors?.length || !rule.selectors.every(selectorHasUnusedComponent)) return;
  removedSelectors.push(rule.selector);
  if (apply) rule.remove();
});

const isChartSelector = (selector) => /trend-chart|stack-grid|waterfall|health-grid|cashflow-bars|sales-orders-plot|product-microtrend|home-mini-bars/i.test(selector);

if (normalizeVisuals) {
  stylesheet.walkRules((rule) => {
    const selector = rule.selector || "";
    rule.walkDecls((declaration) => {
      if (/^border(?:-(top|right|bottom|left))?(?:-style)?$/.test(declaration.prop) && declaration.value.includes("dashed")) {
        normalizedDeclarations.push({ selector, property: declaration.prop, from: declaration.value, to: declaration.value.replaceAll("dashed", "solid") });
        if (apply) declaration.value = declaration.value.replaceAll("dashed", "solid");
        return;
      }
      const isTexture = /repeating-linear-gradient|linear-gradient.*transparent 1px/i.test(declaration.value);
      if (isTexture && !isChartSelector(selector)) {
        normalizedDeclarations.push({ selector, property: declaration.prop, from: declaration.value, to: "none" });
        if (apply) {
          declaration.prop = declaration.prop === "background" ? "background-image" : declaration.prop;
          declaration.value = "none";
        }
      }
    });
  });
}

if (removeDeadBackgroundSize) {
  stylesheet.walkRules((rule) => {
    const hasDisabledImage = rule.nodes?.some((node) => node.type === "decl" && node.prop === "background-image" && node.value === "none");
    if (!hasDisabledImage) return;
    rule.walkDecls("background-size", (declaration) => {
      removedBackgroundSizes.push({ selector: rule.selector || "", value: declaration.value });
      if (apply) declaration.remove();
    });
  });
}

if (reportVisualAssets) {
  stylesheet.walkRules((rule) => {
    rule.walkDecls((declaration) => {
      if (!/^background(?:-image|-size)?$/.test(declaration.prop)) return;
      if (!/(?:gradient\(|url\(|background-size)/i.test(declaration.value)) return;
      visualAssets.push({ selector: rule.selector || "", property: declaration.prop, value: declaration.value });
    });
  });
}

if (removeSuppressedPseudo) {
  const suppressedSelectors = new Set([".promotion-slide::before", ".promotion-slide::after"]);
  stylesheet.walkRules((rule) => {
    if (!rule.selectors?.length || !rule.selectors.every((selector) => suppressedSelectors.has(selector))) return;
    removedSuppressedPseudo.push(rule.selector);
    if (apply) rule.remove();
  });
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  normalizeVisuals,
  removeDeadBackgroundSize,
  reportVisualAssets,
  removeSuppressedPseudo,
  target: path.relative(rootDir, target),
  removedRuleCount: removedSelectors.length,
  selectors: removedSelectors,
  normalizedDeclarationCount: normalizedDeclarations.length,
  normalizedDeclarations,
  removedBackgroundSizeCount: removedBackgroundSizes.length,
  removedBackgroundSizes,
  visualAssets,
  removedSuppressedPseudo,
}, null, 2));

if (apply) fs.writeFileSync(target, stylesheet.toString());
