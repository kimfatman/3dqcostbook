# 批次 19：图表专项优化

**元数据**
- 优先级：P1
- 依赖：批次 11（配色令牌）、批次 12（全局组件）
- 预估耗时：2h
- 风险等级：中
- 状态：⏳ 待执行

## 目标
优化全局 18 个图表的数据表达和美观度，解决硬编码颜色、无入场动画、无 hover 交互、无空态加载态、图表类型不合适等问题。建立全局图表规范，让用户感觉"漂亮且实用"。参考 docs/chart-data-expression-audit-2026-09-01.md。

## 前置条件检查
- [ ] 批次 11、12 已完成
- [ ] 已读取 docs/chart-data-expression-audit-2026-09-01.md（18 个图表审查）
- [ ] 已搜索 client/src 中所有图表组件（chart-card / sales-bars / cashflow / waterfall 等）
- [ ] 三门禁可运行

## 涉及文件
- `client/src/index.css`（全局图表样式：入场动画/Tooltip/空态）
- `client/src/components/charts/`（图表组件，如存在）
- 各页面中的图表代码（Home/Analysis 等）

## 执行步骤

### 步骤1：全局图表规范
在 index.css 中新增统一图表样式：
- 图表卡片：12px 圆角，16px 内边距，bg-surface
- 图表标题：16px -0.01em text-primary，左侧图标
- 图表副标题/时间：12px text-secondary
- 图表容器：position relative，min-height 200px
- 坐标轴：12px text-secondary，网格线 1px border-subtle

### 步骤2：入场动画统一
- 图表卡片：fade-in + slide-up 8px（280ms standard）
- 柱状图：从底部 scaleY 生长（460ms），stagger 延迟 40ms/项
- 折线图：stroke-dashoffset 描边动画（720ms）
- 环形图：stroke-dashoffset 从 0 到目标值（600ms）
- 面积图：opacity 0→1 + translateY（500ms）
- 所有动画包含在 @media (prefers-reduced-motion: no-preference) 中

### 步骤3：hover Tooltip 统一
- Tooltip 样式：12px，bg-elevated，border border-subtle，圆角 8px，padding 8px 12px
- Tooltip 内容：项目名 + 数值 + 占比（如有）
- 显示方式：hover/点击显示，position absolute，z-index 10
- 移动端：点击显示，再次点击或点击其他区域隐藏
- 柱状图/折线图/饼图统一 Tooltip 样式

### 步骤4：空态/加载态
- 加载态：骨架屏 pulse 动画（图表区域灰色渐变闪烁）
- 空态：居中显示"暂无数据"+ 引导文案（如"开始记录后查看图表"）
- 错误态："加载失败"+ 重试按钮
- 所有图表必须有这 3 种状态，不允许空白

### 步骤5：图表类型优化
根据审查报告，调整不合适的图表类型：
- 占比数据：饼图/环形图（非柱状图）
- 趋势数据：折线图/面积图（非柱状图）
- 对比数据：柱状图/条形图（非折线图）
- 构成数据：瀑布图/堆叠柱状图
- 进度数据：环形图/进度条
- 逐项检查 18 个图表，类型不合适的调整

### 步骤6：配色统一
- 所有图表颜色引用语义令牌，不硬编码 #hex
- 主色：action-primary，成功：success，警告：warning，风险：risk，信息：info
- 多系列图表：使用色板（primary/info/success/warning/risk 依次）
- 深色皮肤：图表颜色自动适配（不使用在深色背景上不可见的浅色）

## 验证标准
- [ ] 18 个图表全部有入场动画（卡片淡入+柱状生长/折线描边/环形描边）
- [ ] 所有图表有 hover Tooltip（统一样式：12px/bg-elevated/圆角8px）
- [ ] 所有图表有空态/加载态/错误态（无空白）
- [ ] 图表类型合适（占比用环形/趋势用折线/对比用柱状）
- [ ] 图表颜色引用语义令牌（无硬编码 #hex）
- [ ] 坐标轴 12px text-secondary，网格线 border-subtle
- [ ] 移动端点击显示 Tooltip
- [ ] prefers-reduced-motion 下动画禁用
- [ ] 5 种皮肤下图表颜色正常
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** 折线图描边动画在 Safari 不工作
  **解决：** 添加 -webkit- 前缀，或降级为 opacity 淡入
- **问题：** Tooltip 在图表边缘被裁剪
  **解决：** 图表容器添加 overflow: visible，或 Tooltip 位置自动调整
- **回退：** `git revert` 本批次提交

## 提交信息模板
```
feat(batch-19): 图表专项优化 - 入场动画/hover Tooltip/空态加载态/图表类型/配色统一

- 全局图表规范：卡片样式/标题/坐标轴统一
- 入场动画：卡片淡入+柱状生长(460ms)+折线描边(720ms)+环形描边(600ms)
- hover Tooltip：统一样式(12px/bg-elevated/圆角8px)，移动端点击显示
- 空态/加载态/错误态：骨架屏pulse+暂无数据引导+重试按钮
- 图表类型优化：占比用环形/趋势用折线/对比用柱状，逐项检查18个图表
- 配色统一：引用语义令牌，无硬编码颜色，深色皮肤适配

验收：三门禁全绿 | 变更已登记 | 批次19完成
```
