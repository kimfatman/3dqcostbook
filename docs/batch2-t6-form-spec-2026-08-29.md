# T6 二级表单统一规格（batch2 T6 · W4/R6）

> 日期：2026-08-29。来源：`docs/ui-ux-full-audit-2026-08-27.md` P1-7「成本卡、BOM、供应商、分类、间接成本的标题、辅助说明、字段间距、复选和底部提交区不完全一致」。
> 原则：只统一结构与样式类；不改字段集合、name、校验、提交处理函数与账本写入路径；不新增运行时依赖；不引入装饰性网格或虚线。
> 参照：T3 记一笔表单（「更多信息」折叠 + 底部保存区）的视觉语言，本规格不重构它。

## 类名与适用规则

| 组成       | 类名                                                                                                               | 规则                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 页头       | `sub-intro compact`（既有）                                                                                        | 二级表单页首屏使用 `<section className="sub-intro compact">`：span 面包屑 + h1 + p 辅助说明。预算页保留仪表盘页头 `prototype-budget-title`（整页为环形+预测仪表，不套用紧凑页头）。                                                                               |
| 表单外壳   | 既有外壳（`record-form` / `indirect-cost-form ledger-surface` / `budget-form-card`）+ `secondary-form`（规格标记） | 六个二级表单统一追加 `secondary-form`，外壳类保留以维持各自卡片形态。`secondary-form` 只约束：字段组间距 12px；直子 `label` 网格（gap 6px、11px/750、`--sdq-text-secondary`）；label 内 `<small>` 帮助文本（10px、`--sdq-text-tertiary`、行高 1.5）。             |
| 帮助文本   | label 内 `<small>`                                                                                                 | 字段说明统一放 label 内 `<small>`，样式由 `.secondary-form > label > small` 提供。错误提示沿用既有 `field-error`（role="alert"），不走 small。                                                                                                                    |
| 选择芯片   | `category-chips`（既有，记一笔沿用）                                                                               | 芯片类按钮复用既有 chip 样式；本批六个表单当前无芯片场景，规格保留供后续表单遵循。                                                                                                                                                                                |
| 底部提交区 | `.form-actions`（必选）                                                                                            | 表单最后一个子元素必须是 `<div className="form-actions">`：主按钮 `.fixed-primary.form-save`（type=submit，必选）；可选次按钮 `.form-secondary`（type=button，置于主按钮前，如成本卡「取消并返回」）。单按钮满宽；双按钮按 `1 : 1.7` 分栏（与记一笔保存区一致）。 |
| 主按钮     | `fixed-primary form-save`                                                                                          | 既有品牌蓝主按钮；在 `.form-actions` 内 margin 归零、min-height 44px（`--sdq-height-control`）。                                                                                                                                                                  |
| 次按钮     | `form-secondary`                                                                                                   | 仅与 `.form-actions` 搭配；浅底描边样式，命中区 44px；深色皮肤跟随 `--sdq-text-secondary` 变亮。                                                                                                                                                                  |

## 已应用表单（2026-08-29）

- 供应商表单（`record-form secondary-form` + `form-actions`；跨行业整行复选 `attachment-row` 保留）
- 分类表单（`record-form secondary-form` + `form-actions`；颜色 `select` 保留）
- 成本卡表单（`record-form secondary-form` + `form-actions`；动态材料行 `material-list` / `material-row`、`form-two-col` 保留；次按钮「取消并返回」）
- BOM 表单（`record-form secondary-form` + `form-actions`；动态行/`amount-input` 保留）
- 间接成本分摊表单（`indirect-cost-form ledger-surface secondary-form` + `form-actions`；`indirect-source-choice` / `allocation-switch` / 目标复选保留）
- 预算编辑表单（`budget-form-card secondary-form` + `form-actions`；预算输入 `budget-input` 与错误提示保留）

## 验收

- jsdom DOM 回归（`client/src/pages/Home.secondary-form-spec.dom.test.tsx`）：至少供应商、成本卡、间接成本三个表单断言 `secondary-form`、`.form-actions`、`fixed-primary form-save` 存在，且既有提交路径（保存供应商 / 保存成本卡 / 保存间接费用项）不破。
- `pnpm check` / `pnpm test` / `pnpm build` 三门禁通过。
