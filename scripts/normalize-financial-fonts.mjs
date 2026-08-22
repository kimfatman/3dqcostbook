import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const targets = ["client/src/index.css", "client/src/cashflow-filter.css"];
const legacyPattern = /"IBM Plex Mono"(?:,\s*"MiSans")?(?:,\s*(?:ui-)?monospace|,\s*monospace|,\s*sans-serif)?/g;
const results = [];

for (const relativePath of targets) {
  const target = path.join(rootDir, relativePath);
  const stylesheet = postcss.parse(fs.readFileSync(target, "utf8"), { from: target });
  const changes = [];
  stylesheet.walkDecls("font-family", (declaration) => {
    if (!legacyPattern.test(declaration.value)) return;
    legacyPattern.lastIndex = 0;
    changes.push({ selector: declaration.parent?.selector || "@rule", from: declaration.value });
    if (apply) declaration.value = "var(--financial-numeric-font)";
  });
  if (apply) fs.writeFileSync(target, stylesheet.toString());
  results.push({ target: relativePath, changedDeclarations: changes.length, changes });
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", results }, null, 2));
