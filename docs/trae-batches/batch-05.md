# 批次 05：C8 全局组件统一

**元数据**
- 优先级：P1
- 依赖：无
- 预估耗时：1h
- 风险等级：中
- 状态：✅ 已完成（Trae 执行）

## 变更摘要
- 创建通用 Button 组件（5 变体 × 3 尺寸 × 5 状态）
- 创建通用 Card 组件（3 变体）
- 创建通用 Input 组件（4 状态）
- 创建通用 Modal / Toast / EmptyState / Loading 组件
- 各页面逐步引用通用组件，减少重复实现

## 涉及文件
- client/src/components/Button.tsx
- client/src/components/Card.tsx
- client/src/components/Input.tsx
- client/src/components/Modal.tsx
- client/src/components/Toast.tsx
- client/src/components/EmptyState.tsx
- client/src/components/Loading.tsx

## 验收
- ✅ 三门禁全绿
- ✅ 变更已登记到 docs/change-log.md
