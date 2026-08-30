# 算得清 · 设计系统现状基线（DESIGN.md）

> 生成：2026-08-30（阶段 1 基线提取，供 UI 升级令牌系统化使用）
> 方法：代码反向提取（sd-design-tokens.css / index.css 240KB / cashflow-filter.css 129KB / layout-unification.css 40KB / Home.tsx 结构）
> 对照：docs/design-manual/ 设计手册四份

## 1. 令牌架构现状

| 层 | 位置 | 状态 |
| --- | --- | --- |
| 语义令牌层 | `client/src/sd-design-tokens.css`（4KB） | ✅ 结构良好：30+ `--sdq-*` 语义令牌（bg/text/border/action/语义色/radius/space/motion），三皮肤（light 默认 + skin-deep 深色 + skin-aurora 材质），组件绑定与 focus-visible/reduced-motion 已接 |
| 原色阶层 | ❌ 不存在 | **缺口**：语义令牌直接硬编码 hex，无 50–950 原色阶 |
| Tailwind 桥 | ❌ 不存在 | **缺口**：Tailwind 4 未接 `@theme`，工具类用不上令牌 |
| 值一致性 | ⚠️ 漂移 | 品牌蓝 4 个变体并存（#087aff/#087ff5/#1677ff/#0068d6）+ 灰阶 10+ 近似值（#5d738b/#66809d/#8994a5/#657187/#8b95a7/#586174…） |

## 2. 已生成原色阶（color-palette 方法论，WCAG 校验）

品牌蓝 11 阶（源 #087ff5，h210）：blue-500 #0880f7（与品牌色 Δ2）、blue-600 #056dd4（vs-white 5.07 达 AA，即登录页新深蓝 blue-600）、blue-950 #152b42（≈navy 文本色）。
中性灰 11 阶（源 #5d738b 灰系聚类 h215）：neutral-500 #697a8c（4.41 辅助文字）、neutral-600 #576575（5.96）、neutral-900 #212830（14.88）。

现存 14 个色值全部可收编（Δ≤24）：#087aff/#087ff5/#1677ff/#1890ff → blue-500；#0068d6/#0569de → blue-600；灰系 #5d738b/#66809d/#657187/#8b95a7 → neutral-400/500；#586174 → neutral-600。

## 3. 字体与排版

- 正文栈：`"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`（❌ 与设计手册规定的 MiSans 优先不符——MiSans 未引入，属差距项）
- 金融数字：`--sdq-financial-font`/`--financial-numeric-font` = IBM Plex Mono + tabular-nums（✅ 已广泛接入：报表/详情/排行/预算环等）
- 字阶：无系统化 type scale；实测正文 12–13px、辅助 10–11px、主金额 22–29px、标题 25–36px（批次定下辅助 ≥11px 下限）

## 4. 组件清单（已令牌化/未令牌化）

- ✅ 语义绑定：页面壳、图卡容器、表单控件、focus-visible、按钮 tap-highlight
- ✅ 已规格化组件：二级表单（secondary-form/form-actions，T6）、详情空态（detail-empty-state，T1）、确认层（alertdialog，T4）
- ⚠️ 未令牌化：登录门（selfhost-*）、流水凭证（record-voucher-*，色值硬编码）、现金流畅选（cashflow-filter.css 129KB）

## 5. 与设计手册的差距清单

| 手册要求 | 代码现状 | 差距 |
| --- | --- | --- |
| MiSans 优先字体栈 | Noto Sans SC 优先 | MiSans 未引入（字体文件/回退策略缺失） |
| 原色阶系统 | 无原色阶，hex 直填 | 本批 C1 补齐 |
| 深色皮肤 | skin-deep 令牌完整 | ✅ 基本一致 |
| 状态色语义（收益/成本/利润/风险） | --sdq-income/cost/profit/risk/info 完整 | ✅ |
| 宽屏策略 | 移动壳居中投屏 | 审计 P1-8 遗留（C7） |
| 吉祥物「算小胖」 | 未出现于产品界面 | 仅素材库（splashBlue 含） |

## 6. 全站 P1 遗留卡（阶段 3，源自 ui-ux-full-audit-2026-08-27）

| 卡 | 审计项 | 内容 | 规模 |
| --- | --- | --- | --- |
| C1 | 令牌 | 原色阶 + @theme 桥 + 语义层重指向（视觉回归验收） | M |
| C2 | P1-3 | 流水扫描效率：日期分组标题、右对齐等宽金额列、辅助行降权 | M |
| C3 | P1-2 | 洞察页渐进信息架构：首屏「经营利润+利润桥」，趋势+商品毛利成组，诊断/结构渐进复核 | M |
| C4 | P1-4 | 订单列表无订单空态强化（结果—原因—主行动） | S |
| C5 | P1-5 | 报表列表净营收/利润速览行；供应商/分类行收敛（编辑删除进更多） | M |
| C6 | P1-6 | 智能定价深色块收敛（深 navy 仅承载结果，趋势/模拟回白卡） | S~M |
| C7 | P1-8 | 宽屏策略：≥860px 分析/流水受控双列或居中明确化 | M |
