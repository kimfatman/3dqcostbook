# 变更日志（Change Log）
**用途：** 按日期记录所有功能变更，与功能清单矩阵配合使用
**格式：** 日期倒序，每次 AI 修改后必须登记

---

## 2026-09-01

### 技术
- 批次 13（登录/注册页打磨，载体 SelfHostedAccessGate.tsx —— 项目无 pages/Login.tsx、Register.tsx）：
  - Hero 区：官方品牌印鉴（brandAssets.logoMark）放大为 64×64 圆角 16px（hero-mark 由 29px/10px 升级），标语收敛（移除“专属工作区/私有数据”卖点胶囊，对齐 08-30 评审 P3-2）；hero 配色保持方案 A 线上深色品牌渐变（bg-brand-soft 到 transparent 的浅色方案未采用，保证与已上线的方案 A 视觉一致）；入场动画 fade-in + slide-up（@keyframes sdq-rise-in，400ms，卡片延迟 100ms stagger，prefers-reduced-motion 降级为无动画）
  - 输入统一：登录/注册全部输入框接入批次 12 .sdq-input 类体系（44px --sdq-height-control / 圆角 12 --sdq-radius-md / focus 品牌蓝 4px 光晕 / error risk 描边+光晕 / 前缀图标 16px text-secondary），移动端字号保持 16px 防 iOS 缩放，label 统一 14px text-primary 700 + 必填红星 .sdq-required，::-webkit-autofill 自定义背景文字色，经营行业下拉 SelectTrigger 与输入框等高对齐（min-height --sdq-height-control / radius-md / focus 光晕 15%）
  - 字段级错误：提交时统一收集（邮箱格式/手机号/姓名/店铺名/密码/初始化令牌），输入框下方 12px risk 提示 + CircleAlert 图标 + aria-invalid + 红框光晕，重新输入即消失；修复 P0-5 错误背景色非法写法 var(--sdq-bg-surface)4f3 → color-mix(in srgb, var(--sdq-risk) 8%, var(--sdq-bg-surface))；全局 role=alert 通知契约保留
  - 验证码按钮三态：发送中（sdq-spinner 旋转 + “发送中…” disabled）、倒计时（“60 秒后可重新获取” disabled）、倒计时结束恢复“重新获取验证码”可点击；发送失败保留重试入口与全局提示
  - 密码强度指示器（注册/重设/初始化，登录页不显示）：4 段进度条，弱 1 段 risk / 中 2 段 cost / 强 3-4 段 profit，12px 文字“弱/中/强”+ 建议，纯前端计算（长度≥8+大小写+数字+符号）实时更新
  - 其他打磨：密码眼睛切换触控区 38→44px，协议复选框 17→20px + :active 缩放
  - 回归：新增 SelfHostedAccessGate.batch13.dom.test.tsx（8 用例：CSS 契约 + hero 印鉴 + sdq 输入体系 + 字段级错误 + 密码强度三档 + 验证码三态 + 发送失败），既有方案 A 登录回归 15 项零改动全绿（提交：本批次）
- 批次 12（全局组件打磨）：
  - 按钮：新增 `.sdq-btn` 类体系（五变体 primary/secondary/ghost/danger/link × 三尺寸 sm 32/md 40/lg 48 × 五状态 default/hover/active/disabled/loading），loading 态旋转图标（.sdq-btn-spin）+「处理中」文字+禁点，图标按钮 40×40 最小触控目标 + :active scale .92；只引用 --sdq-* 语义令牌（action 三态/text-link/radius/space），五皮肤自动适配
  - 卡片：新增 `.sdq-card` 三变体（default/elevated/brand），内边距 16/20px（--sdq-space-4/5）、圆角 12/16px（--sdq-radius-md/lg）、elevated 阴影 0 2px 8px（--sdq-blue-950 6% 派生）、可点击卡片 :active scale(.98) + 背景加深、标题 h2 20px -0.01em / 内容 14px
  - 输入框：新增 `.sdq-input` / `.sdq-field` / `.sdq-input-wrap`（44px 高 --sdq-height-control、focus 品牌蓝描边 + 4px 光晕、error risk 描边 + 下方 12px 提示、disabled 态、前缀/后缀图标 16px text-secondary）
  - 标签/徽章/状态点：新增 `.sdq-tag`（8px 圆角 12px 字重 padding 4px 8px，success/warning/danger/info/neutral 语义变体）、`.sdq-badge`（圆形 ≥16×16 通知数字）、`.sdq-dot`（8px 状态点）
  - 模态框：新增 `.sdq-modal-layer/scrim/card`（入场 slide-up + spring 400ms、退场 slide-down 200ms、遮罩 fade-in 200ms、顶部抽屉 20px 圆角、内容区 max-height 70vh 滚动、关闭按钮 40×40）；既有 T4 voucher-guard / 登录 consent 确认层接入同一入场动画语言
  - Toast：`.app-toast` 补齐成功/警告/错误三态（app-toast-success/warning/error + 图标），自动消失改为 3s，入场动画 260ms；Home.tsx notify 支持类型参数（成功保存/失败校验等关键调用点接入）
  - 空态/加载态：新增 `.sdq-empty`（图标+标题+描述+操作按钮，居中）、骨架屏三型（sdq-skeleton-list/card/chart，pulse 动画）、`.sdq-spinner`/`.sdq-loading`、`.sdq-divider` 分割线类
  - 回归：新增 `Home.batch12-global-components.dom.test.tsx`（21 用例：组件类体系契约 + 令牌纪律 + 成功/错误 Toast DOM + loading 按钮 + modal 结构不破），既有测试零改动（提交：本批次）

### 新增
- 批次 11（全局配色与令牌打磨）：
  - 令牌体系补全：primitives.css 功能色补齐 50-950 全阶（success/warning/danger/info 各 11 级，500/600 锚点保持批次 10 值不变，600/700 作为 hover/active 深色阶梯）；semantic.css 补齐批次 11 清单缺口（text-inverse/text-link、action-primary-hover/active/secondary、border-default、success/warning 别名 + bg-risk-soft/bg-info-soft），五皮肤同步覆盖（deep/midnight 取各自中性阶中间值，aurora 继承 :root 并注释说明）
  - 全局替换硬编码颜色：index.css 与 layout-unification.css 中品牌蓝光晕/焦点环/卡片阴影/深色皮肤表面全部改为 color-mix(in srgb, var(--sdq-action-primary|--sdq-blue-800|--sdq-blue-950|--sdq-neutral-950) X%, transparent) 语义派生（色值同 alpha、同色相族，视觉等效）；ManusDialog 弹窗阴影/边框改走 --sdq-shadow-card/--sdq-border-subtle，logo 盒 bg-white→bg-surface
  - 保留策略（注释说明）：玻璃/装饰层白色叠加 rgba(255,255,255,.X)、品牌面浅蓝分隔线/文字渲染、图表特殊色（--chart-* 定义、dark 模式图卡边框、峰值绿光）与第三方品牌色（Manus #1a1a19）、业务数据色（分类颜色/palette 数据）保持字面量，与 cashflow-filter.css 已令牌化约定一致
  - 验证：文字/按钮对比度不受影响（全部为同 alpha 等效替换），五皮肤兼容；三门禁全绿（提交：本批次）

### 新增
- F052 功能登记卡片模板：`docs/feature-cards/TEMPLATE.md`，新增功能时复制填写（提交：06da88f）
- F053 AI 协作变更登记规范：`docs/ai-collaboration-change-log.md`，所有 AI 修改后必须按规范登记（提交：06da88f）
- 变更日志：本文件，按日期记录所有功能变更（提交：06da88f）

### 技术
- 功能层级表（IA+功能清单矩阵）：`docs/information-architecture-feature-matrix-2026-09-01.md`，梳理 5 个一级入口、50 项功能（提交：4050f08）
- 批次 01（C9 导航重构）：5 个 Tab 独立子页面栈管理（stashedStacks/tabSwitchGuardRef）+ Tab 切换 fade-in/slide-up 过渡（220ms）+ 同 Tab 连点防抖 + 底部导航高亮与 :active 缩放（提交：本批次）
- 批次 02（C11 页面 P0 修复）：
  - FAB 避让令牌 `--sdq-space-fab-clearance`（导航+间距令牌派生，≥80px+安全区），工作台/订单/商品/洞察根页与流水/表单子页底部统一消费，洞察瀑布图不再被悬浮按钮遮挡（提交：本批次）
  - 深色信息卡文字令牌 text-inverse 系（`--sdq-text-inverse-secondary/tertiary`、`--sdq-line-inverse`，color-mix 派生自动适配五皮肤）：detail-hero/本期核算卡/首页经营概览卡/售后口径卡次要文字统一反色，深色皮肤（deep/midnight）下对比度达标（提交：本批次）
- 批次 03（C12 页面 P1 批量 6 项，全局样式统一收口）：
  - 间距：新增空间刻度令牌 `--sdq-space-1~10`（4/8/12/16/20/24/32/40px），卡片外边距/内边距统一 16px（`--sdq-space-4`），大卡 20px（`--sdq-space-5`）
  - 圆角：卡片圆角三档令牌收口（大卡 lg 16px / 标准卡 md 12px / 小徽章 sm 8px），作用域特例（原型布局/分段控件/FAB/pill）注释标注
  - 图标：新增图标尺寸三档令牌 `--sdq-icon-nav` 20px / `--sdq-icon-btn` 16px / `--sdq-icon-list` 18px + `--sdq-icon-stroke` 1.5px；Home.tsx 全部 lucide 图标统一尺寸三档 + strokeWidth 1.5，删除 emoji 图标；C5 更多菜单交互结构（row-more/more-trigger/detail-more-menu）保持不动
  - 按钮状态：补全四态（hover brightness(1.05) / disabled opacity .5+not-allowed / active scale(.97)），batch-01 已覆盖的 tabbar :active 保持；T6 二级表单规格已在前批次规格化，本批仅统一 label/星号/高度
  - 分割线：列表项间 1px `--sdq-border-subtle`、左对齐 16px、最后一项无分割线，关闭 ::after 双线残留
  - 表单标签：左对齐 / 14px / text-primary，必填红星由 `.sdq-req::after` CSS 渲染（label 文本不含字面 `*`，无障碍名称不受影响），输入框 min-height 44px，错误提示 12px risk 在字段下方
  - 回归：新增 `Home.batch03-c12-p1.dom.test.tsx`（14 用例：令牌契约 + CSS 规则存在断言 + C5 更多菜单 DOM 回归 + 表单必填星），既有测试文件零改动（提交：本批次）

### 修改
- 演示种子账期：由固定 2026-02~07 + 当期月改为以当前业务月为终点、连续 7 个月窗口，当前账期演示分录锚定今天（月初钳制到今天），并修复旧演示分录 null 金额的跨月恢复推导；同步动态化测试夹具日期，消除月初/跨月脆弱性（提交：本批次）
- F008 商品详情标题：修复"商品商品成本详情"重复问题（提交：5495d6e）——本批次补充回归断言（卡片详情头部标题为"商品成本详情"且无"商品商品"拼接）
- 订单详情关键数据：售后口径卡新增"实际到账"行（成交收入 − 退款冲减），SKU 成交明细行补充成交单价，退款记录保留金额/手续费/回收状态（提交：本批次）
- 商品详情关键数据：近 6 月单位成本趋势新增"较上月"环比变化（金额 + 百分比，涨红跌绿）（提交：本批次）
- 个人与店铺资料页：加载中由纯文本改为骨架屏（role=status + shimmer），读取失败保留 role=alert + 重新加载重试（提交：本批次）

---

## 2026-08-31

### 新增（Trae 执行批次 4-10）
- F017 皮肤中心：5 种官方皮肤（soft/deep/aurora/midnight/forest）+ 自定义皮肤 + 实时预览 + 导入导出（提交：a2f48e6）
- F044 间接成本管理：间接成本池 + 分摊规则（提交：随批次6令牌收敛）

### 修改
- F001-F050 全局令牌收敛：所有组件消除硬编码颜色，统一消费 `--sdq-*` 语义令牌（提交：a752e21）
- F016 登录/注册：OTP 验证修复 + 错误提示具体化 + 重新获取不跳页（提交：432744e）
- F017 皮肤切换：VisualSkin 扩展为 5 种，根组件统一应用 `skin-{id}` class，增加过渡动画（提交：c1e14d2）
- F017 深色模式：令牌补全 + 全局对比度验证达到 WCAG AA（提交：b45c4ef）

### 技术
- 皮肤定义拆分：`sd-design-tokens.css` 拆分为 `tokens/`（3文件）+ `skins/`（6文件）（提交：88115f3）
- C8 全局组件：自定义下拉 + 三段式空态组件（提交：019fac5）
- Apple Design 流体交互适配计划（D1-D4）文档（提交：9c9bba4）
- ui-ux-pro-max 和 emilkowalski skills 研究文档（提交：0f2e3c1）

### 新增（云端直接修复）
- F008 商品详情标题：修复"商品商品成本详情"重复问题（提交：5495d6e）
- F015 退出登录：红色按钮改为中性灰色（提交：5495d6e）
- F003 FAB 全局避让：详情页/洞察页 padding-bottom 增加（提交：5495d6e）
- F007 成本上升徽章：橙色醒目增强（提交：c090a34）
- F008 商品图片上传区：虚线边框 + 蓝色图标加深（提交：c090a34）

### 文档
- 经营分析 PRD V1.0（提交：随初始批次）
- 经营分析技术方案（提交：随初始批次）
- 全局 UI/UX 升级优化总方案（C1-C15 批次）（提交：随初始批次）
- 线上现状问题调研报告（含 OTP/PWA/云函数实测）（提交：随初始批次）
- 线上 UI 美观测试报告（8 页面 17 项问题）（提交：随初始批次）
- 线上 UI 问题解决方案（17 项每项含 skill 依据+多方案+推荐）（提交：随初始批次）
- 本地 PI Agent 逐批执行指令书（提交：随初始批次）
- 全局 UI 布局·元素·图表·标题全面检查（80+ 项优化建议）（提交：随初始批次）
- Trae AI 编程助手执行指令书（10 批次）（提交：22943da / 063d842）
- 皮肤中心设计方案与统一皮肤标准（提交：dd966ed）

---

## 模板（每次新增日期复制以下格式）

```markdown
## YYYY-MM-DD

### 新增
- F0XX 功能名：一句话描述（提交：xxxxxxx）

### 修改
- F0XX 功能名：修改了什么（提交：xxxxxxx）

### 移除
- F0XX 功能名：移除原因（提交：xxxxxxx）

### 技术
- 重构/依赖升级/性能优化等（提交：xxxxxxx）

### 文档
- 文档名：一句话描述（提交：xxxxxxx）
```
