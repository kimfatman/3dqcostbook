/* 算得清 Design System Builder — 在当前 Figma 文件中生成 00–07 全套结构。
 * 用法：Figma → Plugins → Development → Import plugin from manifest → 选中本 manifest.json → 运行。
 * 在目标文件中运行（先新建或打开一个空文件）。生成内容：8 个页面 + 变量集 + 组件。
 */

const H = {
  blue: { 50: '#f3f5f6', 100: '#e5ebf0', 200: '#bfd6ee', 300: '#86bdf3', 400: '#439ef9', 500: '#0880f7', 600: '#056dd4', 700: '#0861ba', 800: '#0e4f90', 900: '#15406b', 950: '#152b42' },
  neutral: { 50: '#f5f7fa', 100: '#ebf0f4', 200: '#d9e0e8', 300: '#bcc6d2', 400: '#8f9dae', 500: '#697a8c', 600: '#576575', 700: '#45515f', 800: '#333d47', 900: '#212830', 950: '#14191f' },
  navy: '#0b1836', navy2: '#1756a6', white: '#ffffff', canvas: '#f5f7fa', success: '#20a779', warn: '#f6a623', danger: '#e8534f', info: '#5acbfa', ink: '#172033', sub: '#576575',
};
const rgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });
const solid = (hex) => [{ type: 'SOLID', color: rgb(hex) }];

function buildVariables() {
  const col = figma.variables.createVariableCollection('SDQ Core');
  const mode = col.modes[0].modeId;
  const mk = (name, hex) => { const v = figma.variables.createVariable(name, col, 'COLOR'); v.setValueForMode(mode, rgb(hex)); };
  Object.keys(H.blue).forEach(k => mk('blue/' + k, H.blue[k]));
  Object.keys(H.neutral).forEach(k => mk('neutral/' + k, H.neutral[k]));
  mk('semantic/success', H.success); mk('semantic/warning', H.warn); mk('semantic/danger', H.danger); mk('semantic/info', H.info);
  mk('semantic/navy', H.navy);
  return col;
}

function T(parent, chars, o = {}) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: o.style || 'Regular' };
  t.characters = chars;
  t.fontSize = o.size || 13;
  t.fills = solid(o.color || H.ink);
  if (o.w) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height); }
  parent.appendChild(t);
  return t;
}
function F(parent, name, w, o = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, o.h || 100);
  if (o.layout !== false) {
    f.layoutMode = o.dir || 'VERTICAL';
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'FIXED';
    f.itemSpacing = o.gap ?? 12;
    f.paddingLeft = f.paddingRight = o.px ?? 16;
    f.paddingTop = f.paddingBottom = o.py ?? 16;
    if (o.wrap) f.layoutWrap = 'WRAP';
    if (o.align) f.counterAxisAlignItems = o.align;
  }
  f.cornerRadius = o.r ?? 12;
  f.fills = o.fill ? solid(o.fill) : [];
  if (o.stroke) { f.strokes = solid(o.stroke); f.strokeWeight = 1; }
  if (o.shadow) f.effects = [{ type: 'DROP_SHADOW', color: { r: 0.08, g: 0.2, b: 0.35, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 16, visible: true, blendMode: 'NORMAL' }];
  parent.appendChild(f);
  return f;
}
function Rect(parent, name, w, h, hex, r) {
  const rc = figma.createRectangle();
  rc.name = name; rc.resize(w, h); rc.cornerRadius = r ?? 8; rc.fills = solid(hex);
  parent.appendChild(rc); return rc;
}
function Btn(parent, label, hex, textColor, w) {
  const b = figma.createComponent();
  b.name = 'Button/' + label; b.resize(w || 160, 44); b.cornerRadius = 12;
  b.layoutMode = 'HORIZONTAL'; b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER';
  b.fills = solid(hex);
  T(b, label, { size: 14, style: 'Bold', color: textColor });
  parent.appendChild(b); return b;
}
function asComp(node, name) { node.name = name; return figma.createComponentFromNode(node); }
function swatchRow(parent, entries) {
  const row = F(parent, 'swatches', 720, { dir: 'HORIZONTAL', gap: 10, py: 0, px: 0, wrap: true });
  entries.forEach(([name, hex]) => {
    const cell = F(row, name, 150, { gap: 4, py: 6, px: 6 });
    Rect(cell, name, 138, 40, hex, 8);
    T(cell, name, { size: 11, style: 'Medium', color: H.ink });
    T(cell, hex.toUpperCase(), { size: 10, color: H.sub });
  });
  return row;
}
function sectionTitle(page, text) { T(page, text, { size: 24, style: 'Bold', color: H.navy, w: 720 }); }

async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  try { buildVariables(); } catch (e) { console.log('variables skipped: ' + e); }

  // ===== 00 封面 =====
  const p0 = figma.createPage(); p0.name = '00｜封面 & 使用说明';
  const cover = F(p0, '封面', 1440, { layout: false, h: 780, r: 0, fill: H.navy });
  const brand = F(cover, 'brand', 720, { dir: 'VERTICAL', gap: 14, px: 0, py: 0, fill: null });
  brand.x = 80; brand.y = 200;
  T(brand, '算得清', { size: 64, style: 'Bold', color: '#ffffff' });
  T(brand, '商家经营账本', { size: 20, color: '#8fb3e8' });
  T(brand, '生意算得清，老板更轻松。', { size: 28, style: 'Bold', color: '#ffffff' });
  T(brand, 'Design System v1.0 · 2026-08-30 · 对齐 main@7b012f8', { size: 13, color: '#8fb3e8' });
  const use = F(cover, '使用说明', 520, { gap: 10, px: 0, py: 0, fill: null });
  use.x = 840; use.y = 200;
  T(use, '使用说明', { size: 16, style: 'Bold', color: '#ffffff' });
  T(use, '01 令牌：颜色/字体/间距/圆角/阴影/图标/图表\n02 组件：按钮/卡片/输入/选项卡/导航/标签/头像/对话框/轻提示/空态\n03 数据可视化：七类图表与数据状态\n04 页面模板：工作台/洞察/列表/详情/表单\n05 App 屏幕：九屏结构线框\n06 原型：app.3dq.site 活原型\n07 研发交接：文件地图与发布流程', { size: 12, color: '#c9d9ef', w: 500 });

  // ===== 01 UI Tokens =====
  const p1 = figma.createPage(); p1.name = '01｜UI Tokens';
  sectionTitle(p1, '01 · UI Tokens — 原色阶 → 语义层 → 三皮肤');
  const t1 = F(p1, 'Tokens', 760, { gap: 18, px: 0, py: 0 });
  T(t1, '品牌蓝 blue（源 #087ff5）', { size: 13, style: 'Bold', color: H.navy });
  swatchRow(t1, Object.entries(H.blue).map(([k, v]) => ['blue-' + k, v]));
  T(t1, '中性灰 neutral（源 #5d738b 灰系）', { size: 13, style: 'Bold', color: H.navy });
  swatchRow(t1, Object.entries(H.neutral).map(([k, v]) => ['neutral-' + k, v]));
  T(t1, '语义色 semantic', { size: 13, style: 'Bold', color: H.navy });
  swatchRow(t1, [['success', H.success], ['warning', H.warn], ['danger', H.danger], ['info', H.info], ['navy', H.navy]]);
  T(t1, 'Typography（Inter 演示；产品栈为 Noto Sans SC/PingFang SC + IBM Plex Mono 金融数字）', { size: 13, style: 'Bold', color: H.navy });
  const ty = F(t1, 'typography', 720, { gap: 8, py: 0, px: 0 });
  T(ty, '主金额 ￥138,640.00 — 27px IBM Plex Mono', { size: 27, style: 'Bold', color: H.navy });
  T(ty, '页面标题 25–36px Bold', { size: 30, style: 'Bold', color: H.ink });
  T(ty, '卡片标题 13–14px Bold', { size: 13, style: 'Bold', color: H.ink });
  T(ty, '正文 12–13px Regular — 所有小微商家的经营数据都算得清楚。', { size: 13, color: H.ink });
  T(ty, '辅助文字 11px — 下限 11px，对比度 ≥4.5:1。', { size: 11, color: H.neutral[500] });
  T(t1, 'Radius / Spacing / Motion', { size: 13, style: 'Bold', color: H.navy });
  const rad = F(t1, 'radius', 720, { dir: 'HORIZONTAL', gap: 12, py: 0, px: 0 });
  [['xs 6', 6], ['sm 8', 8], ['md 12', 12], ['lg 16', 16]].forEach(([n, r]) => { const c = F(rad, 'r' + r, 120, { gap: 4, py: 8, px: 8, fill: H.neutral[50], stroke: H.neutral[200] }); Rect(c, n, 100, 36, '#bfd6ee', r); T(c, 'radius ' + n, { size: 11, color: H.sub }); });
  T(t1, '间距：page-x 16 · section 24 · card 16 · 表单组 12 · 标题-内容 28 ｜ 动效：press 100ms · card 220ms · reduced-motion 降级', { size: 12, color: H.sub, w: 720 });
  T(t1, '变量集：Variables → SDQ Core（blue/* neutral/* semantic/*），建议组件填充绑定量，勿直接硬编码。', { size: 12, color: H.sub, w: 720 });

  // ===== 02 Components =====
  const p2 = figma.createPage(); p2.name = '02｜Components';
  sectionTitle(p2, '02 · Components — 全部为 Figma Component，可直接实例化');
  const c2 = F(p2, 'Components', 900, { gap: 24, px: 0, py: 0 });
  T(c2, 'Button', { size: 14, style: 'Bold', color: H.navy });
  const brow = F(c2, 'buttons', 860, { dir: 'HORIZONTAL', gap: 12, py: 0, px: 0, wrap: true });
  Btn(brow, '登录并继续经营 →', H.blue[500], '#ffffff', 220);
  Btn(brow, '次操作', '#ffffff', H.blue[600], 140).strokes = solid(H.blue[500]);
  Btn(brow, '删除', '#fdedec', H.danger, 120);
  T(c2, 'Card', { size: 14, style: 'Bold', color: H.navy });
  const cardRow = F(c2, 'cards', 860, { dir: 'HORIZONTAL', gap: 16, py: 0, px: 0, align: 'MIN' });
  const c1 = asComp(F(cardRow, 'Card/数据卡', 260, { gap: 8, fill: '#ffffff', stroke: H.neutral[100], shadow: true }), 'Card/数据卡');
  T(c1, '卡片标题', { size: 13, style: 'Bold', color: H.navy }); T(c1, '数据卡 ledger-surface：白底/描边/阴影，承载图表与数据块。', { size: 12, color: H.sub, w: 220 });
  const c2b = asComp(F(cardRow, 'Card/结果卡', 260, { gap: 8, h: 150, fill: H.navy }), 'Card/结果卡');
  T(c2b, '经营利润', { size: 12, color: '#8fb3e8' }); T(c2b, '￥75,660.00', { size: 26, style: 'Bold', color: '#ffffff' }); T(c2b, '深海军蓝结果卡：只承载重要结果。', { size: 11, color: '#8fb3e8', w: 210 });
  T(c2, 'Input', { size: 14, style: 'Bold', color: H.navy });
  const irow = F(c2, 'inputs', 860, { dir: 'HORIZONTAL', gap: 16, py: 0, px: 0 });
  const in1 = asComp(F(irow, 'Input/标准', 260, { gap: 6, py: 0, px: 0 }), 'Input/标准'); T(in1, '邮箱', { size: 12, style: 'Bold', color: H.sub }); Rect(in1, 'field', 260, 46, '#ffffff', 12).strokes = solid(H.neutral[200]);
  const in2 = asComp(F(irow, 'Input/金额', 200, { gap: 6, py: 0, px: 0 }), 'Input/金额'); T(in2, '金额', { size: 12, style: 'Bold', color: H.sub }); Rect(in2, 'field', 200, 56, '#ffffff', 12).strokes = solid(H.neutral[200]); T(in2, '￥ 0.00', { size: 22, style: 'Bold', color: H.blue[500] });
  T(c2, 'Tab（两维度 + 子切换，≥44px）', { size: 14, style: 'Bold', color: H.navy });
  const tabs = asComp(F(c2, 'tabs', 400, { dir: 'HORIZONTAL', gap: 8, py: 0, px: 0 }), 'Tabs/登录方式');
  Btn(tabs, '密码登录', H.blue[500], '#ffffff', 140); Btn(tabs, '验证码登录', '#ffffff', H.blue[600], 140).strokes = solid(H.neutral[200]);
  const seg = asComp(F(c2, 'segmented', 320, { dir: 'HORIZONTAL', gap: 8, py: 0, px: 0 }), 'Tabs/验证码子切换');
  Btn(seg, '邮箱', '#ffffff', H.blue[600], 110).strokes = solid(H.neutral[200]); Btn(seg, '短信', H.neutral[100], H.sub, 110);
  T(c2, 'Navigation · 底部导航（56px + safe-area）', { size: 14, style: 'Bold', color: H.navy });
  const nav = asComp(F(c2, 'tabbar', 390, { dir: 'HORIZONTAL', gap: 0, py: 10, px: 0, h: 62, fill: '#ffffff', stroke: H.neutral[200] }), 'Navigation/Tabbar');
  ['工作台', '订单', '商品', '洞察', '我的'].forEach((t, i) => { const cell = F(nav, 'tab-' + t, 76, { gap: 3, py: 0, px: 0, align: 'CENTER' }); Rect(cell, 'ic', 20, 20, i === 0 ? H.blue[500] : H.neutral[400], 6); T(cell, t, { size: 10, style: i === 0 ? 'Bold' : 'Regular', color: i === 0 ? H.blue[500] : H.sub }); });
  T(c2, 'Tag · 标签', { size: 14, style: 'Bold', color: H.navy });
  const tags = F(c2, 'tags', 860, { dir: 'HORIZONTAL', gap: 8, py: 0, px: 0, wrap: true });
  [['商品采购', H.blue[500], '#ffffff'], ['广告投放', '#ffffff', H.sub], ['技师工资', '#ffffff', H.sub]].forEach(([t, bg, fg]) => { const tg = asComp(F(tags, 'tag-' + t, 110, { dir: 'HORIZONTAL', gap: 0, py: 8, px: 12, align: 'CENTER', r: 99 }), 'Tag/' + t); T(tg, t, { size: 11, style: 'Bold', color: fg }); tg.fills = solid(bg); });
  T(c2, 'Avatar · 头像', { size: 14, style: 'Bold', color: H.navy });
  const av = F(c2, 'avatar', 860, { dir: 'HORIZONTAL', gap: 12, py: 0, px: 0 });
  [['56', H.blue[500]], ['42', '#e9f3ff']].forEach(([s, c]) => { const a = asComp(F(av, 'avatar-' + s, Number(s), { dir: 'HORIZONTAL', gap: 0, py: 0, px: 0, align: 'CENTER', r: 99, h: Number(s) }), 'Avatar/' + s); Rect(a, 'face', Number(s) - 8, Number(s) - 8, c, 99); });
  T(c2, 'Modal · 确认对话框', { size: 14, style: 'Bold', color: H.navy });
  const modal = asComp(F(c2, 'modal', 340, { gap: 10, fill: '#ffffff', stroke: H.neutral[200], shadow: true, r: 14 }), 'Modal/确认');
  T(modal, '放弃未保存的凭证？', { size: 15, style: 'Bold', color: H.navy });
  T(modal, '已上传的凭证图片尚未随流水保存，离开后将不保留。', { size: 12, color: H.sub, w: 300 });
  const mrow = F(modal, 'actions', 300, { dir: 'HORIZONTAL', gap: 8, py: 0, px: 0 });
  Btn(mrow, '留在本页', '#ffffff', H.blue[600], 130).strokes = solid(H.neutral[200]); Btn(mrow, '放弃并离开', '#fdedec', H.danger, 130);
  T(c2, 'Toast · 轻提示', { size: 14, style: 'Bold', color: H.navy });
  const toast = asComp(F(c2, 'toast', 300, { dir: 'HORIZONTAL', gap: 0, py: 10, px: 14, align: 'CENTER', r: 12, h: 40, fill: H.navy }), 'Toast/成功');
  T(toast, '已保存 ￥1,280 记录', { size: 12, color: '#ffffff' });
  T(c2, 'Empty State · 空态（结果—原因—主行动）', { size: 14, style: 'Bold', color: H.navy });
  const es = asComp(F(c2, 'empty', 340, { gap: 6, fill: '#ffffff', stroke: H.neutral[200] }), 'EmptyState/通用');
  T(es, '近 7 日暂无已入账交易', { size: 13, style: 'Bold', color: H.navy }); T(es, '没有订单成交或流水入账。', { size: 11, color: H.sub }); Btn(es, '记录订单', H.blue[500], '#ffffff', 140);

  // ===== 03 Data Visualization =====
  const p3 = figma.createPage(); p3.name = '03｜Data Visualization';
  sectionTitle(p3, '03 · Data Visualization — 七类图表与数据状态（Dycharts 模板体系）');
  const d3 = F(p3, 'dataviz', 900, { gap: 24, px: 0, py: 0 });
  const chartCard = (name, w) => { const c = F(d3, name, w || 400, { gap: 10, fill: '#ffffff', stroke: H.neutral[100], shadow: true }); T(c, name, { size: 12, style: 'Bold', color: H.navy }); return c; };
  // 趋势
  const t1 = chartCard('趋势图 · 平滑曲线 + 面积 + 关键点');
  const tv = figma.createVector(); tv.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 60 C 40 40 70 70 100 45 C 130 20 160 55 190 30 C 210 18 230 40 260 25' }]; tv.strokes = solid(H.success); tv.strokeWeight = 3; tv.fills = []; t1.appendChild(tv); tv.resize(260, 70); tv.x = 16; tv.y = 40;
  // 柱状
  const b1 = chartCard('柱状图 · 圆角柱 + 零基线');
  const brow2 = F(b1, 'bars', 340, { dir: 'HORIZONTAL', gap: 13, py: 0, px: 4, align: 'MAX' });
  [60, 90, 40, 110, 75, 30, 95].forEach(h => Rect(brow2, 'bar', 30, h, h < 35 ? H.neutral[300] : H.blue[500], 4));
  // 环形
  const dn = chartCard('环形图 · 环心数值 + 图例');
  const donut = figma.createEllipse(); donut.resize(110, 110); donut.arcData = { startingAngle: -Math.PI / 2, endingAngle: Math.PI * 0.9, innerRadius: 0.62 }; donut.fills = solid(H.blue[500]); dn.appendChild(donut); donut.x = 16; donut.y = 44;
  const donut2 = figma.createEllipse(); donut2.resize(110, 110); donut2.arcData = { startingAngle: Math.PI * 0.9, endingAngle: Math.PI * 1.7, innerRadius: 0.62 }; donut2.fills = solid(H.warn); dn.appendChild(donut2); donut2.x = 16; donut2.y = 44;
  const dnLabel = T(dn, '净成本 ￥138,640', { size: 12, style: 'Bold', color: H.navy }); dnLabel.x = 40; dnLabel.y = 88;
  // 毛利桥
  const br = chartCard('毛利图 · 利润桥（净营收→成本→费用→利润）');
  const brow3 = F(br, 'bridge', 340, { dir: 'HORIZONTAL', gap: 10, py: 0, px: 4, align: 'MAX' });
  Rect(brow3, 'net', 60, 90, H.success, 4); Rect(brow3, 'cogs', 60, 60, H.warn, 4); Rect(brow3, 'exp', 60, 40, H.warn, 4); Rect(brow3, 'profit', 60, 46, H.blue[500], 4);
  // 结构对照
  const st = chartCard('成本结构图 · 本期/上期双柱（Top3 + 查看全部）');
  const srow = F(st, 'structure', 340, { dir: 'HORIZONTAL', gap: 16, py: 0, px: 4, align: 'MAX' });
  [[70, 50], [55, 65], [40, 30]].forEach(([a, b]) => { const pair = F(srow, 'pair', 90, { dir: 'HORIZONTAL', gap: 6, py: 0, px: 0, align: 'MAX' }); Rect(pair, 'cur', 36, a, H.blue[500], 4); Rect(pair, 'prev', 36, b, H.neutral[300], 4); });
  // 盈亏平衡
  const be = chartCard('盈亏平衡图 · 保本价/建议价/零贡献线');
  const bev = figma.createVector(); bev.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 80 L 120 30 L 260 10' }]; bev.strokes = solid(H.success); bev.strokeWeight = 3; bev.fills = []; be.appendChild(bev); bev.resize(260, 90); bev.x = 16; bev.y = 40;
  Rect(be, 'bep', 12, 12, H.danger, 99).x = 120; Rect(be, 'bep', 12, 12, H.danger, 99).y = 60;
  // 数据状态
  const ds = chartCard('数据状态 · 空态/零值/加载');
  T(ds, '空态：结果标题 + 原因 + 行动入口（合并同类任务）', { size: 12, color: H.sub, w: 340 });
  T(ds, '零值：真实渲染零基线（2% 可见），不隐藏不伪造', { size: 12, color: H.sub, w: 340 });
  T(ds, '错误：role=alert + 可重试', { size: 12, color: H.sub, w: 340 });

  // ===== 04 Page Templates =====
  const p4 = figma.createPage(); p4.name = '04｜Page Templates';
  sectionTitle(p4, '04 · Page Templates — 390×844 基准线框');
  const t4 = F(p4, 'templates', 900, { dir: 'HORIZONTAL', gap: 20, py: 0, px: 0, wrap: true });
  const wire = (name, blocks) => {
    const f = F(t4, name, 390, { layout: false, h: 700, fill: '#ffffff', stroke: H.neutral[200] });
    Rect(f, 'statusbar', 390, 44, H.neutral[50], 0);
    const hdr = F(f, 'header', 390, { dir: 'HORIZONTAL', gap: 8, py: 10, px: 16, fill: '#ffffff' }); Rect(hdr, 'back', 28, 28, H.neutral[100], 8); T(hdr, name, { size: 14, style: 'Bold', color: H.navy });
    blocks.forEach(([label, h, hex]) => { const b = F(f, label, 358, { gap: 6, py: 10, px: 12, fill: hex || '#f7f9fc' }); T(b, label, { size: 11, style: 'Bold', color: H.navy }); b.resize(358, h); });
    const tb = F(f, 'tabbar', 390, { dir: 'HORIZONTAL', gap: 0, py: 10, px: 0, h: 56, fill: '#ffffff' }); ['工作台', '订单', '商品', '洞察', '我的'].forEach(t => { const c = F(tb, 't-' + t, 78, { gap: 3, py: 0, px: 0, align: 'CENTER' }); Rect(c, 'ic', 18, 18, H.neutral[400], 5); T(c, t, { size: 9, color: H.sub }); });
    return f;
  };
  wire('Dashboard 工作台', [['经营主卡（范围切换 今天/本周/本月）', 96, H.navy], ['补充指标：订单数/客单价/退款影响', 48], ['销售趋势 近7日', 110], ['优先风险/提醒', 70], ['宣传轮播', 60]]);
  wire('Analysis 洞察', [['经营利润 + 利润桥', 120, H.navy], ['趋势 + 商品毛利', 120], ['成本诊断（渐进复核）', 110], ['结构变化 Top3', 100]]);
  wire('List 列表（订单/商品/流水）', [['筛选行 + 批量入口', 40], ['日期分组/列表行 ×N（金额右对齐 tabular）', 380], ['悬浮记一笔', 44, H.blue[500]]]);
  wire('Detail 详情', [['detail-hero 深蓝头（对象名+关键数值）', 120, H.navy], ['breakdown 区块', 160], ['主操作区（编辑/测算）+ 更多', 52], ['关联信息', 90]]);
  wire('Form 表单（T6 规格）', [['页头 sub-intro', 60], ['首屏字段组（类型/金额/日期/标签）', 200], ['更多信息折叠（供应商/备注/凭证）', 80], ['固定提交区 + 保存并继续', 60]]);

  // ===== 05 App Screens =====
  const p5 = figma.createPage(); p5.name = '05｜App Screens';
  sectionTitle(p5, '05 · App Screens — 九屏结构与数据源（390×844）');
  const s5 = F(p5, 'screens', 900, { dir: 'HORIZONTAL', gap: 20, py: 0, px: 0, wrap: true });
  const screen = (name, rows) => {
    const f = F(s5, name, 390, { layout: false, h: 620, fill: '#ffffff', stroke: H.neutral[200] });
    Rect(f, 'header', 390, 48, H.neutral[50], 0);
    rows.forEach(([label, h, hex]) => { const b = F(f, label, 390, { gap: 4, py: 8, px: 12, fill: hex || '#ffffff' }); T(b, label, { size: 10, style: 'Bold', color: H.navy }); b.resize(390, h); });
    return f;
  };
  screen('首页（工作台）', [['经营主卡 今天/本周/本月 + 优先行动', 120, H.navy], ['补充指标 订单数/客单价/退款', 52], ['宣传轮播', 56], ['销售动能 近7日', 96], ['商品排行 / 最近动态', 96], ['tabbar', 56, H.neutral[50]]]);
  screen('订单', [['筛选 + 搜索 + 批量入口', 44], ['订单列表（成交日/金额 tabular/复核状态）', 300], ['悬浮记一笔', 40, H.blue[500]], ['tabbar', 56, H.neutral[50]]]);
  screen('商品（成本卡）', [['搜索 + 分类筛选', 44], ['成本卡列表（名称/单位成本/售价/单件利润）', 280], ['新增成本卡', 40, H.blue[500]], ['tabbar', 56, H.neutral[50]]]);
  screen('成本卡详情', [['detail-hero：SKU/售价/单位成本/毛利率', 110, H.navy], ['BOM 构成明细', 150], ['订单 SKU 实绩', 80], ['编辑成本/测算定价 + 更多(删除)', 48]]);
  screen('BOM', [['配方项列表（名称/规格/数量/金额）', 240], ['添加成本项', 40, H.blue[500]], ['重算说明', 56]]);
  screen('经营分析（洞察）', [['经营利润 + 利润桥', 110, H.navy], ['利润趋势 + 真实事件', 110], ['成本诊断（净成本/Top驱动/优先核对）', 120], ['结构变化 Top3 + 查看全部', 100], ['行业参考估算（未入账）', 44]]);
  screen('订单录入', [['交易类型（支出/其他收入/商品销售/手工退款）', 48], ['金额 + 退款可选字段', 90], ['日期 + 标签 chips', 90], ['更多信息折叠（供应商/备注/凭证）', 60], ['保存记录 + 保存并继续', 48, H.blue[500]]]);
  screen('库存（商品库存提醒）', [['库存预警入口与状态', 110], ['商品库存列表', 200], ['tabbar', 56, H.neutral[50]]]);
  screen('资金（现金流）', [['现金流总览（收入/支出/净额）', 110], ['供应商支出排行（下钻）', 120], ['账单导出 CSV/XLSX', 44], ['tabbar', 56, H.neutral[50]]]);
  screen('我的', [['店铺身份卡（印鉴/名称/预算）', 90, H.navy], ['经营报表 / 供应商 / 分类管理 / 预算 / 行业 / 外观', 220], ['消息中心（顶栏铃铛）', 40], ['tabbar', 56, H.neutral[50]]]);

  // ===== 06 Prototype =====
  const p6 = figma.createPage(); p6.name = '06｜Prototype';
  sectionTitle(p6, '06 · Prototype — 活原型与深链');
  const p6c = F(p6, 'prototype', 720, { gap: 10 });
  T(p6c, '活原型 = 生产站本体', { size: 14, style: 'Bold', color: H.navy });
  T(p6c, 'https://app.3dq.site （评审演示账号 / 真实账号均可）', { size: 13, color: H.blue[600] });
  T(p6c, '深链索引：/?screen=records 经营流水 · ?screen=cards 成本卡 · ?screen=analysis 洞察 · ?screen=profile 我的（组件状态由应用内导航承载）', { size: 12, color: H.sub, w: 700 });
  T(p6c, '交互规格：Tab 切换即改状态；浮层遵循 04 模板；所有下钻走 categoryKey 精确筛选。', { size: 12, color: H.sub, w: 700 });

  // ===== 07 Developer Handoff =====
  const p7 = figma.createPage(); p7.name = '07｜Developer Handoff';
  sectionTitle(p7, '07 · Developer Handoff — 研发交接');
  const d7 = F(p7, 'handoff', 760, { gap: 12 });
  T(d7, '文件地图', { size: 14, style: 'Bold', color: H.navy });
  T(d7, '令牌层 client/src/sd-design-tokens.css（原色阶 blue/neutral 50–950 + 语义层 + 三皮肤 + @theme 桥）\n组件与页面 client/src/pages/Home.tsx（页面容器）· client/src/components/*（SelfHostedAccessGate 登录门等）\n样式 client/src/index.css 240KB · cashflow-filter.css · layout-unification.css · sd-design-tokens.css\n品牌资产 client/public/brand-assets/*（注册表 client/src/lib/brand-assets.ts）\n图表实现 Home.tsx（Dycharts 模板体系，recharts + SVG）', { size: 12, color: H.ink, w: 740 });
  T(d7, '令牌引用', { size: 14, style: 'Bold', color: H.navy });
  T(d7, 'CSS 变量 var(--sdq-*) · Tailwind @theme 工具类（brand-500/600 · ink · muted · surface · canvas · profit/cost/risk）\n禁止引入色阶外新色值；辅助文字 ≥11px；对比度 ≥4.5:1；触控 ≥44px。', { size: 12, color: H.ink, w: 740 });
  T(d7, '质量门禁', { size: 14, style: 'Bold', color: H.navy });
  T(d7, 'pnpm check / test（63 文件 281+）/ build · Playwright e2e（CI）· 375/390/430/768/1280 五视口 × 浅深皮肤\n账本红线：金额分存储两位展示 · 订单成交日/退款日归属 · SKU 快照冻结 · 乐观锁 · 语义令牌不回退', { size: 12, color: H.ink, w: 740 });
  T(d7, '发布流程', { size: 14, style: 'Bold', color: H.navy });
  T(d7, 'main → git -c core.autocrlf=false archive → scp → release.sh（构建/迁移/重启）→ healthz + HTTPS + UID 10001 + 源码标记验收', { size: 12, color: H.ink, w: 740 });
  T(d7, '设计评审基线', { size: 14, style: 'Bold', color: H.navy });
  T(d7, 'docs/login-page-design-review-2026-08-30.md（方案 A 已上线）· docs/ui-ux-full-audit-2026-08-27.md（P1 遗留清单）· docs/design-system/DESIGN.md（令牌基线）', { size: 12, color: H.blue[600], w: 740 });

  figma.notify('算得清 Design System 已生成：8 个页面 + SDQ Core 变量集', { timeout: 5000 });
  figma.closePlugin();
}

main();
