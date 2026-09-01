# 批次 12：全局组件打磨

**元数据**
- 优先级：P0
- 依赖：批次 05（全局组件统一，已完成）、批次 11（配色令牌）
- 预估耗时：2h
- 风险等级：中（影响所有使用通用组件的页面）
- 状态：⏳ 待执行

## 目标
打磨全局通用组件（按钮/卡片/输入框/标签/徽章/模态框/Toast/空态/加载态/分割线），确保样式统一、交互完整、无障碍达标。建立组件规范，所有页面引用通用组件而非重复实现。

## 前置条件检查
- [ ] 批次 05 已完成（全局组件统一）
- [ ] 批次 11 已完成（配色令牌）
- [ ] 已读取 client/src/components/ 下所有通用组件
- [ ] 三门禁可运行

## 涉及文件
- `client/src/components/Button.tsx`（按钮组件）
- `client/src/components/Card.tsx`（卡片组件）
- `client/src/components/Input.tsx`（输入框组件）
- `client/src/components/Modal.tsx`（模态框组件）
- `client/src/components/Toast.tsx`（提示组件）
- `client/src/components/EmptyState.tsx`（空态组件）
- `client/src/components/Loading.tsx`（加载态组件）
- `client/src/components/Badge.tsx`（徽章组件）
- `client/src/index.css`（组件全局样式）

## 执行步骤

### 步骤1：按钮组件打磨
- 变体：primary / secondary / ghost / danger / link（5 种）
- 尺寸：sm 32px / md 40px / lg 48px（3 种）
- 状态：default / hover / active / disabled / loading（5 种）
- 加载状态：显示旋转图标 + 文字变为"处理中"，禁止点击
- 图标按钮：40×40 最小触控目标，:active scale 0.92
- 所有按钮引用组件，不内联实现

### 步骤2：卡片组件打磨
- 变体：default / elevated / brand（3 种）
- 内边距：16px（标准）/ 20px（大卡）
- 圆角：12px（标准）/ 16px（大卡）
- 阴影：elevated 卡片有轻微阴影（0 2px 8px rgba(0,0,0,0.06)）
- 可点击卡片：:active scale(0.98) + 背景加深
- 卡片标题：h2 20px -0.01em，卡片内容：body 14px

### 步骤3：输入框组件打磨
- 变体：default / error / disabled（3 种）
- 尺寸：44px 高度（移动端触控目标）
- 状态：default / focus / error / disabled（4 种）
- focus：边框 action-primary + 4px 外发光（rgba(22,119,255,0.15)）
- error：边框 risk + 下方错误提示 12px
- 标签：14px text-primary，必填项加红色 *
- 前缀/后缀图标：16px，颜色 text-secondary

### 步骤4：模态框组件打磨
- 入场动画：从底部 slide-up + spring（400ms）
- 退场动画：向底部 slide-down + fade-out（200ms，比入场快）
- 背景遮罩：rgba(0,0,0,0.5) + fade-in 200ms
- 圆角：顶部 20px（底部抽屉）/ 16px（居中弹窗）
- 标题：h2 20px，关闭按钮 40×40
- 内容区最大高度：70vh，超出滚动
- 点击遮罩关闭（可配置）

### 步骤5：Toast / 空态 / 加载态
- Toast：顶部下滑，自动消失 3s，成功/警告/错误 3 种图标
- 空态：插画 + 标题 + 描述 + 操作按钮，居中显示
- 加载态：骨架屏 pulse 动画（列表/卡片/图表 3 种骨架）
- 分割线：1px border-subtle，左对齐 16px，最后一项无

### 步骤6：标签 / 徽章
- 标签（Tag）：8px 圆角，12px 字号，padding 4px 8px，5 种颜色（default/primary/success/warning/risk）
- 徽章（Badge）：圆形，10px 字号，最小 16×16，用于通知数字
- 状态点：8px 圆点，用于在线/离线状态

## 验证标准
- [ ] 按钮组件 5 变体 × 3 尺寸 × 5 状态完整
- [ ] 卡片组件 3 变体完整，可点击卡片有 active 反馈
- [ ] 输入框组件 4 状态完整，focus 有外发光，error 有提示
- [ ] 模态框入场/退场动画流畅，点击遮罩可关闭
- [ ] Toast 3 种类型，自动消失 3s
- [ ] 空态有插画+标题+描述+操作按钮
- [ ] 加载态有骨架屏 pulse 动画
- [ ] 标签/徽章/状态点样式统一
- [ ] 所有页面引用通用组件，无重复实现
- [ ] 组件无障碍达标（aria-label / role / focus 管理）
- [ ] 5 种皮肤下组件样式正常
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** 替换为通用组件后某些页面样式错乱
  **原因：** 该页面有特殊样式需求，通用组件不满足
  **解决：** 扩展通用组件的 props，或为该页面添加特例样式
- **问题：** 模态框动画在低端设备卡顿
  **解决：** 添加 will-change: transform，减少动画层级
- **回退：** `git revert` 本批次提交

## 提交信息模板
```
feat(batch-12): 全局组件打磨 - 按钮/卡片/输入框/模态框/Toast/空态/加载态统一

- 按钮组件：5变体×3尺寸×5状态，含加载状态
- 卡片组件：3变体，可点击卡片active反馈
- 输入框组件：4状态，focus外发光，error提示
- 模态框组件：入场spring动画，退场fade-out，点击遮罩关闭
- Toast/空态/加载态/标签/徽章/分割线统一
- 所有页面引用通用组件，无重复实现

验收：三门禁全绿 | 变更已登记 | 批次12完成
```
