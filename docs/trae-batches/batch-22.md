# 批次 22：Logo 区重构 + 融入主页过渡设计

**元数据**
- 优先级：P1
- 依赖：批次 14（工作台）、批次 21（可阅读性）
- 预估耗时：2h
- 风险等级：中
- 状态：⏳ 待执行

## 目标
将首页 Logo 区重构为苹果风格毛玻璃导航栏，并设计 4 层叠加过渡让 Logo 区平滑融入主页：毛玻璃悬浮导航栏 + 渐变遮罩 + 问候语缓冲区域 + 品牌色渐变细线。解决当前 Logo 突兀、双 logo 叠加、店铺名字距过紧、行业月份 8px 等问题。参考 docs/logo-area-redesign-2026-09-01.md 和 docs/logo-integration-transition-2026-09-01.md。

## 前置条件检查
- [ ] 批次 14、21 已完成
- [ ] 已读取 docs/logo-area-redesign-2026-09-01.md（13 项问题）
- [ ] 已读取 docs/logo-integration-transition-2026-09-01.md（4 层过渡设计）
- [ ] 已读取 client/src/pages/Home.tsx renderHeader 当前内容
- [ ] 三门禁可运行

## 涉及文件
- `client/src/index.css`（清理 .brand-mini 重复定义 + 新增导航栏/问候语样式）
- `client/src/pages/Home.tsx`（重构 renderHeader + 问候语区域 + 滚动监听）
- `client/src/tokens/primitives.css`（如需要新增动效令牌，可与批次23合并）

## 执行步骤

### 步骤1：清理 CSS 重复定义（必须先做）
- 搜索 index.css 中所有 .brand-mini 相关定义（约 5 处），全部删除
- 包括：.brand-mini / .brand-mini img / .brand-mini strong / .brand-mini em / .brand-mini span::after / .brand-seal-stack / .brand-seal / .brand-store-logo
- 清理 .page-header / .orders-prototype-header / .header-icon / .back-button 旧样式中与新导航栏冲突的部分
- 全局搜索确认无残留

### 步骤2：新增苹果风格毛玻璃导航栏
在 index.css 新增 .app-nav-bar 系列样式：
- position: sticky top:0 z-index:100，height: 52px，padding: 0 16px + safe-area
- 背景：color-mix(bg-surface 72%, transparent)，backdrop-filter: blur(20px) saturate(180%)
- 滚动时（.scrolled）：背景加深到 88%
- 深色皮肤：背景 60%（浅色 72%）
- 底部渐变遮罩（::after）：height 16px，从导航栏背景渐变到透明，滚动时淡出
- 无硬边框（border-bottom: none）

### 步骤3：重构 renderHeader
将 Home.tsx renderHeader 替换为新结构：
- 左侧：店铺切换器（store-switcher）
  - 店铺头像 36×36 圆角 10px（单一 logo，无双 logo 叠加）
  - 店铺信息：店铺名 15px -0.01em（非 -0.16em 过紧），行业月份 11px（非 8px）
  - 下拉箭头 14px text-tertiary
  - :active scale(0.97) + 背景加深
- 右侧：导航操作按钮（nav-actions）
  - 消息按钮 40×40，:active scale(0.92)
  - 未读数字徽章（notification-badge）：10px 字号，最小 16×16，risk 背景，非 5×5 红点
- 保留 sub-header（返回按钮+标题）逻辑不变

### 步骤4：新增问候语缓冲区域
在 HomePage 顶部新增 .home-greeting-buffer：
- 问候语（greeting-time）：12px text-secondary，根据时间变化（早上好/下午好/晚上好）
- 大标题（greeting-title）：28px -0.02em text-primary（店铺名）
- 摘要（greeting-summary）：13px text-secondary（月份+本月利润或引导文案）
- 品牌色渐变细线（::after）：width 48px height 3px，从 action-primary 渐变到透明
- 入场动画：fade-in + slide-up 8px（0.6s 延迟 0.1s）
- 滚动时（.collapsed）：opacity 0 + translateY(-12px) + height 0，平滑折叠

### 步骤5：添加滚动监听
在 App 根组件或 HomePage 中：
- useState(isScrolled)，useEffect 监听 window.scroll
- 滚动 >40px 时 setIsScrolled(true)，否则 false
- passive: true 提升性能
- 将 isScrolled 传递给 renderHeader（导航栏 .scrolled 类）和问候语区域（.collapsed 类）

### 步骤6：入场动画 stagger
为首页主要内容添加入场延迟：
- 导航栏：0ms
- 问候语区域：100ms（已有 greeting-fade-in）
- 经营概览卡片：200ms，fade-in-up
- 图表卡片：300ms（调整现有 chart-card-in 延迟）
- 列表区域：400ms，list-stagger
- 所有动画包含在 prefers-reduced-motion: no-preference 中

## 验证标准
- [ ] .brand-mini 5 处重复定义已删除，全局搜索无残留
- [ ] 导航栏毛玻璃效果正常（backdrop-filter: blur 20px + saturate 180%）
- [ ] 导航栏无硬边框，底部渐变遮罩融化到内容
- [ ] 滚动时导航栏背景加深（72%→88%），渐变遮罩淡出
- [ ] 店铺头像 36×36 单一 logo（无双 logo 叠加）
- [ ] 店铺名 15px -0.01em（非 -0.16em），行业月份 11px（非 8px）
- [ ] 问候语区域存在（问候语+大标题28px+摘要+品牌色细线48px）
- [ ] 问候语根据时间变化（早上好/下午好/晚上好/夜深了）
- [ ] 滚动时问候语区域平滑折叠
- [ ] 店铺切换点击有缩放反馈（:active scale 0.97）
- [ ] 消息按钮 40×40，未读显示数字徽章（非 5×5 红点）
- [ ] 入场动画 stagger 流畅（导航栏→问候语→概览→图表→列表）
- [ ] 5 种皮肤下导航栏颜色/毛玻璃正常
- [ ] 深色皮肤导航栏不透明度 60%（浅色 72%）
- [ ] 安全区域适配（env(safe-area-inset-top)）
- [ ] prefers-reduced-motion 下动画禁用
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** 毛玻璃效果在 Firefox 不工作
  **解决：** Firefox 支持 backdrop-filter，如不支持降级为半透明背景（无 blur）
- **问题：** 滚动监听导致性能问题
  **解决：** 使用 passive: true，节流 100ms，或使用 IntersectionObserver
- **问题：** 问候语区域折叠时内容跳动
  **解决：** 确保 height 从 auto 过渡到 0，使用 grid-template-rows 或 max-height
- **回退：** `git revert` 本批次提交

## 提交信息模板
```
feat(batch-22): Logo区重构+融入主页过渡 - 毛玻璃导航栏/4层叠加过渡/问候语区域/滚动折叠

- 清理.brand-mini 5处重复定义
- 新增苹果风格毛玻璃导航栏（blur 20px+saturate 180%，无硬边框，底部渐变遮罩）
- 重构renderHeader：店铺切换器（单一头像36×36，店铺名15px -0.01em，行业月份11px）
- 消息按钮40×40+数字徽章（非5×5红点）
- 新增问候语缓冲区域（问候语+大标题28px+摘要+品牌色渐变细线48px）
- 滚动监听：导航栏背景加深72%→88%，问候语区域平滑折叠
- 入场动画stagger（导航栏→问候语→概览→图表→列表）
- 5种皮肤兼容（浅色72%/深色60%），安全区域适配，减少动效适配

验收：三门禁全绿 | 变更已登记 | 批次22完成
```
