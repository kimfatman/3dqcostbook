# 批次 23：全局过渡与动效专项优化

**元数据**
- 优先级：P1
- 依赖：批次 11（配色令牌）、批次 22（Logo 区过渡）
- 预估耗时：3h
- 风险等级：高（全局动画，容易影响性能和可访问性）
- 状态：⏳ 待执行

## 目标
建立全局动效规范并补齐缺失过渡：新增动效令牌（5级时长+5级缓动）、页面切换过渡、列表/卡片统一入场、折叠展开过渡、弹簧物理动画、数据更新过渡、模态框过渡、加载空态过渡。解决当前只有 18 处 transition、5 个 @keyframes、页面切换/列表入场/折叠展开等关键过渡缺失的问题。参考 docs/global-transition-audit-2026-09-01.md。

## 前置条件检查
- [ ] 批次 11、22 已完成
- [ ] 已读取 docs/global-transition-audit-2026-09-01.md（29处现有过渡/12类缺失）
- [ ] 已搜索全局 transition / @keyframes / animation 使用情况
- [ ] 三门禁可运行

## 涉及文件
- `client/src/tokens/primitives.css`（新增动效令牌：时长/缓动）
- `client/src/index.css`（全局过渡规范：页面切换/入场/折叠/交互/模态框/加载）
- `client/src/pages/Home.tsx`（页面切换过渡 + 列表 stagger 入场）
- `client/src/App.tsx`（页面切换 key 触发动画）
- 其他页面组件（折叠展开过渡 + 数据更新过渡）

## 执行步骤

### 步骤1：新增全局动效令牌
在 primitives.css 新增：
```css
/* 时长令牌 */
--sdq-duration-instant: 80ms;     /* 微交互：hover/高亮/焦点 */
--sdq-duration-fast: 160ms;       /* 快速交互：按钮/输入框/折叠箭头 */
--sdq-duration-standard: 220ms;   /* 标准过渡：卡片入场/页面切换/开关 */
--sdq-duration-slow: 320ms;       /* 慢速过渡：折叠展开/大面板 */
--sdq-duration-entrance: 400ms;   /* 入场动画：页面入场/模态框 */

/* 缓动令牌 */
--sdq-ease-standard: cubic-bezier(.23, 1, .32, 1);   /* Apple 标准 ease-out-expo */
--sdq-ease-in: cubic-bezier(.42, 0, 1, 1);
--sdq-ease-out: cubic-bezier(0, 0, .58, 1);
--sdq-ease-in-out: cubic-bezier(.42, 0, .58, 1);
--sdq-spring: cubic-bezier(.34, 1.56, .64, 1);        /* 弹簧：轻微过冲 */
```

### 步骤2：页面切换过渡
- Tab 切换：内容区 fade-in + slide-up 8px（220ms standard）
- 子页面进入：从右侧 slide-in + fade-in（250ms standard）
- 子页面退出：向右侧 slide-out + fade-out（200ms ease-in，退出比进入快）
- 实现：App.tsx 中 main 元素添加 key={tab + subPage}，触发 React 重新挂载，配合 CSS animation
- 过渡期间防抖 200ms，禁止快速连续切换

### 步骤3：列表/卡片统一入场动画
- 所有卡片：fade-in + slide-up 8px（220ms standard），类名 .fade-in-up
- 列表项 stagger：每项延迟 40ms，最多延迟 320ms（8项后不再延迟），类名 .list-stagger
- 页面整体 stagger：导航栏 0ms → 问候语 100ms → 概览 200ms → 图表 300ms → 列表 400ms
- 图表卡片已有 chart-card-in 动画，保持不变，只调整延迟与整体 stagger 对齐

### 步骤4：折叠展开过渡
- 通用折叠组件（批次20已创建）：grid-template-rows 0fr→1fr（320ms slow）
- 折叠内容淡入：opacity 0→1（250ms，延迟 50ms）
- 折叠箭头旋转：rotate 180deg（180ms fast），与内容展开同步
- 可中断：CSS transition 天然可中断，快速点击不跳变
- 检查所有折叠区域使用通用组件，无内联实现

### 步骤5：弹簧物理动画
- 按钮点击：:active scale(0.97) → 释放后 spring 回弹（160ms，--sdq-spring）
- FAB：点击 spring 缩放，带轻微过冲
- 模态框入场：slide-up + scale(0.96→1) + spring（400ms entrance）
- 模态框退场：slide-down + fade-out（200ms ease-in，比入场快）
- 模态框背景遮罩：fade-in 200ms ease-out
- 实现：用 CSS cubic-bezier(.34,1.56,.64,1) 模拟弹簧，不需要引入动画库

### 步骤6：数据更新过渡
- 数字变化：滚动计数动画（从旧值滚动到新值，300ms ease-out-cubic）
  - 实现：useCountUp hook（requestAnimationFrame + ease-out-cubic）
  - 应用：经营概览金额/KPI 数字/利润数字
  - 如实现复杂，降级为 opacity 闪烁过渡
- 图表柱状图高度：height 过渡（220ms standard），数据切换时平滑变化
- 进度环：stroke-dashoffset 过渡（300ms standard）
- 进度条：width 过渡（200ms standard）

### 步骤7：加载/空态过渡
- 骨架屏：pulse 动画（background-position 200%→-200%，1.5s ease-in-out infinite）
- 空态入场：fade-in-up（220ms，延迟 200ms）
- 错误态：轻微 shake + fade-in（如需要）
- 加载旋转：保持现有 rotate 0.8s linear，可改为 spring 旋转（如需要）
- 页面加载：骨架屏 → 内容 fade-in 交叉过渡（非硬切）

### 步骤8：统一现有过渡时长/缓动
搜索 index.css 中所有硬编码 transition 时长和缓动，替换为令牌：
- 160ms → var(--sdq-duration-fast)
- 180ms → var(--sdq-duration-fast)
- 200ms/220ms/240ms/260ms/280ms → var(--sdq-duration-standard)
- 320ms → var(--sdq-duration-slow)
- ease-out → var(--sdq-ease-out)
- cubic-bezier(.23,1,.32,1) → var(--sdq-ease-standard)
- **例外**：图表入场动画（chart-card-in 280ms / chart-line-in 720ms / chart-bar-in 460ms）保持不变，这些是精心设计的图表动画

## 验证标准
- [ ] 动效令牌已定义（5级时长：80/160/220/320/400ms + 5级缓动）
- [ ] Tab 切换有 fade-in + slide-up 过渡（220ms standard）
- [ ] 子页面进入从右侧 slide-in（250ms），退出向右侧 slide-out（200ms，退出比进入快）
- [ ] 所有卡片有统一入场动画（fade-in-up 220ms）
- [ ] 列表项有 stagger 入场（每项延迟 40ms，最多 320ms）
- [ ] 折叠展开有 grid-template-rows 过渡（0fr→1fr，320ms slow）
- [ ] 折叠内容有淡入动画（延迟 50ms）
- [ ] 按钮点击有弹簧回弹（:active scale + spring 缓动）
- [ ] 模态框入场有弹簧动画（slide-up + scale + spring 400ms）
- [ ] 模态框退场有 fade-out（200ms ease-in）
- [ ] 数字变化有滚动计数动画（或 opacity 过渡降级）
- [ ] 图表柱状图高度有过渡（220ms standard）
- [ ] 空态有入场动画（fade-in-up 延迟 200ms）
- [ ] 骨架屏有 pulse 动画
- [ ] 现有硬编码时长/缓动已替换为令牌（除图表特殊动画外）
- [ ] 快速连续操作时过渡可中断（无"跳变"）
- [ ] 5 种皮肤下过渡效果正常
- [ ] prefers-reduced-motion 下所有动画禁用（全局已有，验证不冲突）
- [ ] 低端设备动画不卡顿（will-change 优化）
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** 页面切换动画导致白屏
  **原因：** key 变化触发重新挂载，旧内容立即消失
  **解决：** 使用 CSS animation  both，确保动画结束前保持最终状态
- **问题：** 折叠展开动画在内容复杂时卡顿
  **解决：** 添加 will-change: grid-template-rows，减少同时动画的元素
- **问题：** 弹簧动画在低端设备卡顿
  **解决：** 降级为标准 ease-out，或减少动画层级
- **问题：** 数字滚动计数与 React 状态更新冲突
  **解决：** useRef 存储当前值，requestAnimationFrame 更新，不触发额外渲染
- **回退：** `git revert` 本批次提交

## 提交信息模板
```
feat(batch-23): 全局过渡与动效专项优化 - 动效令牌/页面切换/统一入场/折叠展开/弹簧物理/数据更新

- 新增动效令牌：5级时长（80/160/220/320/400ms）+ 5级缓动（standard/in/out/in-out/spring）
- 页面切换过渡：Tab fade-in+slide-up 220ms，子页面 slide-in 250ms/slide-out 200ms
- 统一入场动画：所有卡片 fade-in-up 220ms，列表项 stagger 40ms（最多320ms）
- 折叠展开过渡：grid-template-rows 0fr→1fr 320ms，内容淡入延迟50ms，可中断
- 弹簧物理动画：按钮点击spring回弹，模态框入场slide-up+scale+spring 400ms
- 数据更新过渡：数字滚动计数300ms，柱状图高度220ms，进度环300ms
- 加载空态过渡：骨架屏pulse 1.5s，空态fade-in-up延迟200ms
- 统一现有硬编码时长/缓动为令牌（图表特殊动画除外）

验收：三门禁全绿 | 变更已登记 | 批次23完成
```
