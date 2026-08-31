# 算得清 × Apple Design 风格与流体交互 · 适配方案

> 日期：2026-08-30。方法论来源：emilkowalski/skills 的 `apple-design`（WWDC *Designing Fluid Interfaces* 2018 + *The Details of UI Typography* 2020 的 Web 转译，MIT）。配套安装：`animate` / `find-animation-opportunities` / `improve-animations` / `review-animations` / `animation-vocabulary` / `emil-design-eng`。
> 适用：算得清 App（React 19 + Tailwind 4 + 语义令牌 v2）。前置：C1–C7 已上线（语义令牌、44px 触控、对比度达标、prefers-reduced-motion 已接入）。

---

## 一、现状对照：苹果原则 × 算得清

| 苹果原则 | 算得清现状 | 判定 |
| --- | --- | --- |
| 1. 响应（杀延迟） | 按压反馈已有（scale .97/100ms），但仅覆盖部分按钮；表单提交、Tab 切换无即时反馈 | ⚠️ 部分达标 |
| 2. 直接操纵（1:1 跟踪） | 无拖拽交互（列表/卡片无手势） | ✅ 不适用即不做 |
| 3. 可中断性（最重要） | 全部为 CSS transition（非手势驱动，可接受） | ✅ 现阶段够用 |
| 4. 弹簧替代固定时长 | 无弹簧；toast/卡片过渡为固定时长 ease | ⚠️ 升级点（克制引入） |
| 5. 速度交接 | 无手势释放场景 | ✅ 不适用即不做 |
| 6. 动量投影 | 无 flick 场景 | ✅ 不适用即不做 |
| 7. 空间一致性 | 子页进出路径一致性未系统化（goSub 返回方向、面板进出同路径） | ⚠️ 待核 |
| 8. 手势方向暗示 | 无 | ✅ 不适用即不做 |
| 9. 橡皮筋边界 | 原生滚动自带 | ✅ |
| 10. 手势细节 | 触控 44px 已达标、tap-highlight 已透明 | ✅ |
| 11. 帧级顺滑 | transform/opacity 动画为主，compositor 友好 | ✅ |
| 12. 材质与景深 | tabbar/页头为不透明实底；detail-hero 有景深 | **⚠️ 最大升级点** |
| 13. 多模态反馈 | 无触觉/声音（Web 可选 Vibration API） | ⚠️ 低优先 |
| 14. 减弱动效 | prefers-reduced-motion 已全量接入 | ✅ |
| 15. 字体排版 | 字阶已定；**letter-spacing 未随字号变化**（大标题未收紧） | ⚠️ 升级点 |
| 16. 八项设计原则 | 账本红线=责任；组件令牌化=Craft；空态三段=Wayfinding | ✅ 高度吻合 |
| 17. 流程 | 活原型=生产站本体（天然优势） | ✅ |

**结论：** 算得清已有 10 项天然达标（移动优先 + 令牌 + reduced-motion 的底子好），真正的升级空间集中在三处：**材质半透明层（P1）、即时按压反馈全覆盖（P1）、空间一致性与排版微调（P2）**——全部克制在 CSS/令牌层，不引入手势与弹簧库（苹果原则：不为动而动）。

---

## 二、落地清单（四张卡）

### D1 · 即时按压反馈全覆盖（P1，~0.5 天）

- 全交互元素统一 `:active { transform: scale(0.97); transition: transform 100ms ease-out }`——反馈发生在 **pointer-down 瞬间**，不是 click
- 覆盖：fixed-primary、表单次按钮、tabbar 五项、列表行、chips、更多菜单触发器
- 排查并清除输入路径上的人为延迟（无谓 debounce/transition wait）
- 验收：DOM 审计（所有 button/a 存在 :active 规则）+ 现有回归全绿

### D2 · 材质与景深（P1，~1 天）—— 视觉升级主菜

- **底部导航材质化**：`background: rgba(255,255,255,.6) + backdrop-filter: blur(20px) saturate(180%)`，内容从其下滚过；顶缘 1px 亮边模拟受光；滚动边缘效果替代硬分隔线
- **页头/次级页头**同材质化；深色皮肤用深色半透明材质（rgba(11,24,54,.55)）
- **detail-hero 已有景深**：补 `materialize` 进出场（blur 半径+scale 同步动效，非纯 fade）
- **层级规则**：大面积=厚材质（更强 blur+更深阴影），小元素=轻材质；严禁轻材质叠轻材质
- 验收：Playwright 截图（浅/深皮肤 × 滚动前/中/后）+ prefers-reduced-transparency 降级断言

### D3 · 空间一致性与排版（P2，~0.5 天）

- 子页进出**同路径对称**：goSub 进入方向与返回方向镜像；可逆过渡用镜像缓动曲线
- 弹层 transform-origin 锚定触发元素（更多菜单从触发器展开，不从中心）
- 排版：大标题 letter-spacing 收紧（-0.02em 随字号增长）、正文近 0；行高与大字号反向；间距换 rem/em 支持系统字号缩放
- 验收：DOM 断言 + 截图对比

### D4 · 克制的弹簧与反馈（P2，可选，~0.5 天）

- 引入 `motion`（Framer Motion 的 spring API）**仅三处**：toast 出场（damping 1.0/response 0.3）、详情页 hero 进场（materialize）、确认层 scale（0.97→1）
- 其余保持 CSS transition——苹果原则「克制」：非手势场景不硬上弹簧
- 触觉可选：关键动作（保存成功/删除确认）Vibration API 15ms（Android），同一帧触发
- 验收：improve-animations/review-animations 方法论过审 + reduced-motion 断言

## 三、红线与克制

- **不为动而动**：无手势场景不引入弹簧/惯性；每个动效能追溯到四项人类需求之一（安全/理解/成就/愉悦）
- 账本红线不变；语义令牌只引用；不新增依赖（D4 除外，引入 motion 一个库需评审）
- 每卡照旧：独立分支 → pi + DeepSeek → 主线独立复验 → 三门禁 → Runbook 发布

## 四、执行引擎

沿用既有闭环：D1/D2/D3 纯 CSS/JSX 由 pi 逐卡实施（预计 2 天）；D4 含库引入需单卡评审后实施（0.5 天）。每卡完成即合并推送，全部完成后统一发布生产并做五视口视觉回归。
