// Figma DS 验证脚本 — 用法：node figma-verify.cjs <FILE_KEY> [TOKEN]
// 检查：页面清单（00–07）/ SDQ Core 变量集 / 变量数量
const fs = require('fs');
const FILE_KEY = process.argv[2];
const TOKEN = process.argv[3] || (() => { try { return fs.readFileSync('C:/Users/Administrator/.openclaw-autoclaw/workspace/.openclaw/tmp/figma-token.txt', 'utf8').trim(); } catch (e) { return null; } })();
if (!FILE_KEY || !TOKEN) { console.error('usage: node figma-verify.cjs <FILE_KEY> [TOKEN]'); process.exit(1); }
const H = { 'X-Figma-Token': TOKEN };
(async () => {
  const f = await (await fetch(`https://api.figma.com/v1/files/${FILE_KEY}?depth=1`, { headers: H })).json();
  if (!f.document) { console.log('FILE READ FAIL: ' + JSON.stringify(f).slice(0, 200)); process.exit(1); }
  console.log(`FILE: ${f.name} | pages: ${f.document.children.length}`);
  f.document.children.forEach(p => console.log(`  ${p.id}  ${p.name}`));
  const expected = ['00', '01', '02', '03', '04', '05', '06', '07'];
  const names = f.document.children.map(p => p.name);
  expected.forEach(e => console.log(`  page ${e}: ${names.some(n => n.startsWith(e)) ? 'OK' : 'MISSING'}`));
  try {
    const v = await (await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/variables/local`, { headers: H })).json();
    if (v.meta && v.meta.variableCollections) {
      const cols = Object.values(v.meta.variableCollections);
      const sdq = cols.find(c => c.name === 'SDQ Core');
      if (sdq) {
        const vars = Object.values(v.meta.variables).filter(x => x.variableCollectionId === sdq.id);
        console.log(`SDQ Core: modes=${sdq.modes.length} vars=${vars.length}`);
      } else console.log('SDQ Core collection: NOT FOUND');
    } else console.log('variables read: no meta (scope/plan limit)');
  } catch (e) { console.log('variables read fail: ' + String(e).slice(0, 120)); }
})();
