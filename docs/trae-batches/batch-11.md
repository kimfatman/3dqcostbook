# 批次 11：全局配色与令牌打磨

**元数据**
- 优先级：P0
- 依赖：批次 06（设计令牌收敛，已完成）
- 预估耗时：2h
- 风险等级：中（全局颜色替换，可能引发回归）
- 状态：⏳ 待执行

## 目标
完善全局配色令牌体系，将所有硬编码颜色替换为语义令牌，确保 5 种皮肤下颜色一致。建立完整的颜色层级（canvas/surface/elevated/brand-soft）和文字层级（primary/secondary/tertiary/inverse）。

## 前置条件检查
- [ ] 批次 06 已完成（设计令牌收敛）
- [ ] 已读取 client/src/tokens/primitives.css 和 semantic.css
- [ ] 已读取 client/src/skins/ 下 5 种皮肤文件
- [ ] 三门禁可运行

## 涉及文件
- `client/src/tokens/primitives.css`（基础颜色令牌）
- `client/src/tokens/semantic.css`（语义颜色令牌）
- `client/src/skins/*.css`（5 种皮肤颜色覆盖）
- `client/src/index.css`（全局样式，替换硬编码颜色）
- 各页面组件（替换硬编码颜色）

## 执行步骤

### 步骤1：完善颜色令牌体系
确认 primitives.css 中定义了完整的颜色基础色板：
- 品牌色：primary 50-900（10 级）
- 中性色：gray 50-900（10 级）
- 功能色：success/warning/risk/info 各 50-900
- 确认每种颜色有对应的 hover/active 深色版本

### 步骤2：完善语义令牌
确认 semantic.css 中定义了完整的语义令牌：
- 背景层：--sdq-bg-canvas / surface / elevated / brand-soft / overlay
- 文字层：--sdq-text-primary / secondary / tertiary / inverse / link
- 操作层：--sdq-action-primary / primary-hover / primary-active / secondary
- 边框层：--sdq-border-subtle / default / strong
- 功能层：--sdq-success / warning / risk / info（含 bg-soft 版本）

### 步骤3：全局替换硬编码颜色
- 搜索所有 .css/.tsx 文件中的硬编码颜色（#hex / rgb / rgba）
- 替换为对应的语义令牌
- 优先级：先替换 index.css 全局样式，再替换各页面组件
- 注意：图表特殊颜色（如瀑布图渐变色）可保留硬编码，但需注释说明

### 步骤4：5 种皮肤颜色覆盖
- 确认每种皮肤文件覆盖了所有语义令牌
- 深色皮肤（deep/midnight）：背景色加深，文字色反转，边框色调整
- 浅色皮肤（aurora/soft/forest）：保持浅色背景，品牌色不同
- 每种皮肤至少覆盖：bg-canvas / bg-surface / text-primary / action-primary / border-default

### 步骤5：颜色对比度验证
- 文字与背景对比度：正文 ≥4.5:1，大标题 ≥3:1
- 功能色（success/warning/risk）在浅色和深色背景下都可读
- 禁用状态文字对比度 ≥3:1
- 使用在线对比度工具或浏览器 DevTools 验证

## 验证标准
- [ ] 颜色令牌体系完整（基础色板 10 级 × 6 色 + 语义令牌 20+ 项）
- [ ] 全局无硬编码颜色（图表特殊颜色除外，需注释）
- [ ] 5 种皮肤下颜色一致（无遗漏令牌）
- [ ] 文字对比度达标（正文 ≥4.5:1，标题 ≥3:1）
- [ ] 功能色在浅色/深色背景下都可读
- [ ] 深色皮肤背景不发灰（使用深蓝/深紫而非纯黑）
- [ ] 浅色皮肤品牌色不过于刺眼（饱和度适中）
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** 替换颜色后某些页面文字不可读
  **原因：** 该页面使用了 text-tertiary 在深色背景上
  **解决：** 深色背景上使用 text-inverse 或 rgba(255,255,255,0.7)
- **问题：** 5 种皮肤切换时颜色闪烁
  **原因：** 皮肤切换没有颜色过渡
  **解决：** 全局添加 background-color/color/border-color 0.2s 过渡（已有）
- **回退：** `git revert` 本批次提交

## 提交信息模板
```
feat(batch-11): 全局配色与令牌打磨 - 完善语义令牌+全局替换硬编码颜色+5种皮肤覆盖

- 完善基础色板（品牌/中性/功能色各10级）
- 完善语义令牌（背景/文字/操作/边框/功能 5层20+项）
- 全局替换硬编码颜色为语义令牌（图表特殊色除外）
- 完善5种皮肤颜色覆盖（无遗漏令牌）
- 验证文字对比度（正文≥4.5:1，标题≥3:1）

验收：三门禁全绿 | 变更已登记 | 批次11完成
```
