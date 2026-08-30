// Figma Variables REST 同步脚本 — 用法：node figma-sync-variables.cjs <FILE_KEY> [TOKEN]
// 创建/更新 SDQ Core 变量集（blue/neutral 50–950 + semantic + navy）
const fs = require('fs');
const FILE_KEY = process.argv[2];
const TOKEN = process.argv[3] || (() => { try { const t = fs.readFileSync('C:/Users/Administrator/.openclaw-autoclaw/workspace/.openclaw/tmp/figma-token.txt', 'utf8').trim(); return t || null; } catch (e) { return null; } })();
if (!FILE_KEY || !TOKEN) { console.error('usage: node figma-sync-variables.cjs <FILE_KEY> [TOKEN]'); process.exit(1); }

const H = {
  blue: { 50: '#f3f5f6', 100: '#e5ebf0', 200: '#bfd6ee', 300: '#86bdf3', 400: '#439ef9', 500: '#0880f7', 600: '#056dd4', 700: '#0861ba', 800: '#0e4f90', 900: '#15406b', 950: '#152b42' },
  neutral: { 50: '#f5f7fa', 100: '#ebf0f4', 200: '#d9e0e8', 300: '#bcc6d2', 400: '#8f9dae', 500: '#697a8c', 600: '#576575', 700: '#45515f', 800: '#333d47', 900: '#212830', 950: '#14191f' },
  navy: '#0b1836', success: '#20a779', warning: '#f6a623', danger: '#e8534f', info: '#5acbfa',
};
const rgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });

const body = {
  variableCollections: [{ action: 'CREATE', tempId: 'tmp:sdq-core', name: 'SDQ Core', hiddenFromPublishing: false, modes: [{ tempId: 'tmp:light', name: 'light' }, { tempId: 'tmp:dark', name: 'dark' }] }],
  variableIds: [],
  variables: [],
};
let vi = 0;
const addVar = (name, lightHex, darkHex) => {
  const tempId = `tmp:v${vi++}`;
  body.variables.push({ action: 'CREATE', tempId, name, variableCollectionId: 'tmp:sdq-core', resolvedType: 'COLOR', valuesByMode: { 'tmp:light': rgb(lightHex), 'tmp:dark': rgb(darkHex || lightHex) } });
};
Object.entries(H.blue).forEach(([k, v]) => addVar('blue/' + k, v));
Object.entries(H.neutral).forEach(([k, v]) => addVar('neutral/' + k, v));
addVar('semantic/success', H.success); addVar('semantic/warning', H.warning); addVar('semantic/danger', H.danger); addVar('semantic/info', H.info); addVar('semantic/navy', H.navy);

(async () => {
  const r = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/variables/local`, {
    method: 'POST',
    headers: { 'X-Figma-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(`HTTP ${r.status}`);
  console.log(text.slice(0, 1200));
  if (r.status === 200) console.log('\nSDQ Core 变量集创建成功：' + body.variables.length + ' 个变量（light/dark 双模式）');
})();

