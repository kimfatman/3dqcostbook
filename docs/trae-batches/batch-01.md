# 批次 01：C9 导航重构

**元数据**
- 优先级：P0
- 依赖：无
- 预估耗时：1h
- 风险等级：中（影响全局导航）
- 状态：✅ 已完成

## 目标
重构底部导航系统，解决导航层级混乱、Tab 切换无过渡、子页面返回逻辑不一致等问题。建立统一的 pageStack 栈管理，确保进入退出路径一致。

## 前置条件检查
- [ ] 当前分支为 agent/business-analysis-v1
- [ ] 工作区干净（git status 无未提交改动）
- [ ] 三门禁可运行（pnpm check && pnpm test && pnpm build）
- [ ] 已读取 client/src/lib/navigation-state.ts 了解现有导航状态

## 涉及文件
- `client/src/lib/navigation-state.ts`（导航状态类型定义）
- `client/src/App.tsx`（导航逻辑，pageStack 管理）
- `client/src/components/BottomNav.tsx`（底部导航组件，如存在）
- `client/src/index.css`（导航相关样式）

## 执行步骤

### 步骤1：统一导航状态类型
确保 navigation-state.ts 中定义了完整的导航类型：
```typescript
type TabKey = 'home' | 'orders' | 'cards' | 'analysis' | 'profile';
interface NavState {
  currentTab: TabKey;
  pageStack: Record<TabKey, string[]>; // 每个Tab独立的子页面栈
}
```

### 步骤2：实现 pageStack 栈管理
- 每个 Tab 维护独立的子页面栈
- 进入子页面：push 到当前 Tab 的栈
- 返回：pop 栈顶，如栈空则回到 Tab 首页
- Tab 切换：保留各 Tab 的栈状态，切换回来时恢复

### 步骤3：统一返回逻辑
- 所有子页面的返回按钮调用统一的 `goBack()` 函数
- 安卓物理返回键 / 浏览器后退键也调用同一函数
- 返回时如栈空，提示"再按一次退出"或直接退出

### 步骤4：Tab 切换过渡
- Tab 切换时内容区添加 fade-in + slide-up 8px 过渡（220ms standard）
- 过渡期间禁止快速连续切换（防抖 200ms）

### 步骤5：底部导航高亮
- 当前 Tab 高亮（action-primary 颜色 + 图标填充态）
- 未选中 Tab（text-secondary 颜色 + 图标线框态）
- 点击时有缩放反馈（:active scale 0.92）

## 验证标准
- [ ] 5 个 Tab 切换正常，高亮状态正确
- [ ] 每个 Tab 的子页面栈独立，切换 Tab 后返回不丢失
- [ ] 子页面进入/返回逻辑一致，无死循环
- [ ] 浏览器后退键正常工作
- [ ] Tab 切换有 fade-in + slide-up 过渡
- [ ] 底部导航 40px 触控目标，字号 ≥10px
- [ ] 5 种皮肤下导航颜色正常
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

## 常见问题与回退
- **问题：** Tab 切换时白屏
  **原因：** 内容区 key 变化导致重新挂载，过渡未生效
  **解决：** 确保 key={tab} 触发动画，动画类名正确
- **问题：** 返回按钮不工作
  **原因：** pageStack 未正确 push/pop
  **解决：** 检查进入子页面时是否调用了 push，返回时是否调用了 pop
- **回退：** `git revert` 本批次提交，恢复原导航逻辑

## 提交信息模板
```
feat(batch-01): C9导航重构 - 统一pageStack栈管理+Tab切换过渡

- 实现5个Tab独立的子页面栈管理
- 统一返回逻辑（按钮/物理键/浏览器后退）
- Tab切换添加fade-in+slide-up过渡（220ms）
- 底部导航高亮状态统一

验收：三门禁全绿 | 变更已登记 | 批次01完成
```
