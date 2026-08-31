# UI 设计升级 · 技能选用建议（算得清）

**日期：** 2026-08-30
**任务：** 为「算得清 App 全局 UI 设计升级」筛选可用的 Agent 技能
**方法：** 扫描技能目录初筛 12 个候选，逐一读取 SKILL.md 确认真实能力，按项目栈（Tailwind 4 + 语义色令牌 + 移动优先产品 UI）与升级目标映射

---

## 核心推荐（5 个）

| 技能 | 能力 | 在算得清升级中的用法 | 优先级 |
| --- | --- | --- | --- |
| `stitch::extract-design-md` | 从现有代码库反向提取设计系统文档（组件/样式/Tailwind 配置/令牌 → DESIGN.md） | **第一步基线**：从代码生成「设计系统现状」，与 `docs/design-manual/` 设计手册对照，找出「手册说的 vs 代码做的」差距 | 第 1 步 |
| `color-palette` | 从单一品牌色生成 11 阶色阶（50–950）+ 语义令牌 + 深色变体 + WCAG 对比检查 + Tailwind v4 CSS 输出 | 用品牌蓝 `#087ff5` 生成完整色阶，把散在 CSS 的语义令牌升级为系统化色板（登录页对比度问题的根治方案） | 第 2 步 |
| `tailwind-design-system` | Tailwind v4 设计系统：CSS-first 配置、设计令牌、组件变体、响应式模式 | 本项目正是 Tailwind 4——把色阶落成 CSS-first 令牌与组件变体规范 | 第 2 步 |
| `ui-ux-pro-max` | 改进现有 UI/UX、设计令牌、组件规格、微文案、a11y、落到具体代码改动 | **主工作流**：覆盖全量审计 P1 遗留（洞察页渐进信息架构、流水扫描效率、二级表单统一），工作流即「改进现有 UI → 令牌与组件规范 → 具体代码改动」 | 第 3 步 |
| `accessibility-review` | WCAG 2.1 AA 审计：对比度/键盘导航/触控目标/读屏行为 | 升级后验收：全站巡检（登录页发现的对比度/触控问题属同类，这次系统化复查） | 第 4 步 |

## 辅助推荐（3 个）

| 技能 | 用法 | 备注 |
| --- | --- | --- |
| `web-design-engineer` | 桌面端左右分栏等高视觉页面改造实施 + 浏览器 QA | 设计工程师视角，React/HTML 产物 |
| `web-design-reviewer` | 升级完成后视觉巡检回归（截图 + DOM 审计 + 修复） | 已在登录页评审验证好用 |
| `web-perf` | 主 bundle >500kB 警告治理（Core Web Vitals：LCP/INP/CLS） | 依赖 Chrome DevTools MCP，本机 mcporter 当前为空，需先配置 |

## 明确不推荐（3 个）

| 技能 | 原因 |
| --- | --- |
| `frontend-page-design` | 自述排除 dashboards/产品 UI/多步产品界面，专攻落地页作品集；算得清是产品 UI |
| `motion-graphics` | 动态文字/logo 动画属营销物料；产品内受 prefers-reduced-motion 约束价值低 |
| `muapi-ui-design` | 生成高保真 mockup 需外部 muapi.ai API；项目已有明确设计语言与手册 |

## 建议实施顺序（四步，每步有验收）

1. **基线提取**（~0.5 天）：`stitch::extract-design-md` 生成 DESIGN.md 现状 → 与 `docs/design-manual/` 设计手册逐项对照，输出差距清单
2. **令牌系统化**（~1 天）：`color-palette`（品牌蓝 #087ff5 色阶）+ `tailwind-design-system`（CSS-first 令牌落地）→ 散落 CSS 语义令牌收编
3. **页面级改造**（2–3 天）：`ui-ux-pro-max` 按全量审计 P1 遗留逐页改造（洞察页/流水/二级表单），`frontend-design` 把质量关，`web-design-engineer` 做桌面分栏
4. **三重验收**（~1 天）：`accessibility-review`（WCAG AA 全站）+ `web-design-reviewer`（视觉回归）+ `web-perf`（bundle/Lighthouse）

## 与既有工作的关系

- 输入基线：`docs/ui-ux-full-audit-2026-08-27.md`（P0 已清、P1/P3 遗留）+ `docs/login-page-design-review-2026-08-30.md`（方案 A 已上线）
- 设计语言输入：`docs/design-manual/`（设计手册四份 + 14 张注册素材）
- 执行引擎沿用：pi + DeepSeek 逐卡实现 + 主线独立复验 + 三门禁 + Runbook 发布

## 决策待定

升级范围二选一：**只做令牌系统化**（第 1–2 步，~1 天）或 **令牌 + 全站 P1 遗留改造**（第 1–4 步，3–5 天）。`web-perf` 是否纳入取决于是否愿意先配置 Chrome DevTools MCP。

---

## 调研补全（2026-08-30，主线直读两仓库源文件；调研子 Agent 因 LLM 瞬时故障终止，不影响结论）

### ui-ux-pro-max（已更新至上游最新并本地安装验证）

- 数据规模：79 styles / 192 product palettes / 74 font pairings / 119 UX guidelines / 105 icons / 17 GSAP presets / 25 chart types / 22 stacks（含 react/nextjs/shadcn 等 CSV）
- 工作流（Python 3 零依赖，scripts/search.py）：
  1. 新项目/全局方向 → `--design-system`（聚合 style/color/landing/typography + ui-reasoning 推理 → 模式/风格/色板/字体/效果/反模式）
  2. 定向问题 → `--domain ux|color|typography|icons|charts|gsap`（每域有优先级 1–10 规则表：Accessibility CRITICAL → Touch 44×44 CRITICAL → … → Charts）
  3. 已知栈 → `--stack react|nextjs|shadcn`（实现细节）
  4. `--persist --output-dir` 落盘复用
- 对算得清的用法：审计 P1 逐项用 `--domain ux` 定向查询（如 "error summary validation"）；实现细节用 `--stack react`；升级方向校验用 `--design-system` 对照现有蓝白经营工具风格

### emilkowalski/skills 流体交互工具链（已安装 7 个，分工闭环）

| 技能 | 角色 | 铁律摘要 |
| --- | --- | --- |
| find-animation-opportunities | 找机会（只报告不实现） | 克制至上：每 App 最多 5–7 条建议；100+/天的高频操作**永远不做动画**（键盘操作=一票否决） |
| animate | 建造 | 决策顺序：要不要动→目的→工具→属性→曲线；曲线/时长用表内精确值，禁止手造 cubic-bezier；向既有令牌扩展 |
| improve-animations | 审计+规划 | recon→八类并行审计→自包含计划（执行者零上下文零品味也能做对） |
| review-animations | 评审 | 十项铁律：动画需理由；ease-in 是 block；UI <300ms；origin 从 0.9–0.97+opacity（禁 scale(0)）；只动 transform/opacity；非对称进出；reduced-motion |
| apple-design | 方法论总纲 | WWDC Designing Fluid Interfaces 17 节（响应/直接操纵/可中断/弹簧/速度交接/动量投影/空间一致/材质/排版/八原则） |

### 对 D 卡的影响

D1–D3 不变（CSS 层，无手势不引入弹簧——与 find/animate 的频率门一致）。D4 弹簧卡若立项：曲线与时长**必须取自 review-animations/STANDARDS.md 与 apple-design 数值表**（damping 1.0 默认、bounce 仅限动量场景），并由 review-animations 验收。
