# Trae AI Agent 执行指南（优化版）

**版本：** V2.0 ｜ **日期：** 2026-09-01 ｜ **适用：** Trae / Cursor / 任意 AI 编程助手
**仓库：** 3dqcostbook（算得清·商家成本管家）｜ **分支：** agent/business-analysis-v1
**总批次：** 23 批 ｜ **总修改点：** 350+ ｜ **预估总耗时：** 35-48h

---

## 一、执行总览表

| 批次 | 名称 | 优先级 | 依赖 | 预估耗时 | 风险 | 状态 |
|---|---|---|---|---|---|---|
| 1 | C9 导航重构 | P0 | 无 | 1h | 中 | ✅ 已完成 |
| 2 | C11 页面 P0 修复 | P0 | 1 | 1h | 低 | ✅ 已完成 |
| 3 | C12 页面 P1 批量 6 项 | P1 | 2 | 1.5h | 低 | ✅ 已完成 |
| 4 | OTP 验证码修复 | P0 | 无 | 0.5h | 低 | ✅ 已完成 |
| 5 | C8 全局组件统一 | P1 | 无 | 1h | 中 | ✅ 已完成 |
| 6 | 设计令牌收敛 | P0 | 5 | 1h | 中 | ✅ 已完成 |
| 7 | 皮肤文件拆分 | P0 | 6 | 1h | 中 | ✅ 已完成 |
| 8 | 皮肤统一切换 | P0 | 7 | 1h | 中 | ✅ 已完成 |
| 9 | 皮肤中心页面 | P1 | 8 | 1.5h | 低 | ✅ 已完成 |
| 10 | 深色模式完善 | P1 | 8 | 1h | 中 | ✅ 已完成 |
| 11 | 全局配色与令牌打磨 | P0 | 6 | 2h | 中 | ✅ 已完成 |
| 12 | 全局组件打磨 | P0 | 5,11 | 2h | 中 | ✅ 已完成 |
| 13 | 登录/注册页打磨 | P1 | 12 | 1.5h | 低 | ⏳ 待执行 |
| 14 | 工作台打磨 | P0 | 12 | 2h | 中 | ⏳ 待执行 |
| 15 | 订单模块打磨 | P0 | 12 | 2h | 中 | ⏳ 待执行 |
| 16 | 商品模块打磨 | P0 | 12 | 2h | 中 | ⏳ 待执行 |
| 17 | 洞察模块打磨 | P0 | 12 | 2.5h | 高 | ⏳ 待执行 |
| 18 | 我的模块打磨 | P1 | 12 | 1.5h | 低 | ⏳ 待执行 |
| 19 | 图表专项优化 | P1 | 11,12 | 2h | 中 | ⏳ 待执行 |
| 20 | 层级收纳专项优化 | P1 | 12 | 2h | 中 | ⏳ 待执行 |
| 21 | 可阅读性专项优化 | P0 | 11 | 3h | 高 | ⏳ 待执行 |
| 22 | Logo 区重构+融入过渡 | P1 | 14,21 | 2h | 中 | ⏳ 待执行 |
| 23 | 全局过渡与动效优化 | P1 | 11,22 | 3h | 高 | ⏳ 待执行 |

**执行顺序建议：**
1. **第一批（基础层）：** 1 → 2 → 3 → 11 → 12（导航+页面P0+配色+组件，搭好基础）
2. **第二批（页面层）：** 14 → 15 → 16 → 17 → 13 → 18（核心页面优先，次要页面随后）
3. **第三批（专项层）：** 21 → 19 → 20 → 22 → 23（可阅读性先做，其他专项随后，全局过渡最后）

---

## 二、AI Agent 执行指南

### 2.1 环境准备（执行前必须确认）

```bash
# 1. 确认分支
git branch --show-current  # 必须是 agent/business-analysis-v1

# 2. 确认工作区干净
git status --short  # 应该为空，如有未提交改动先处理

# 3. 拉取最新代码
git pull origin agent/business-analysis-v1

# 4. 确认依赖已安装
ls node_modules/.package-lock.json  # 如不存在运行 pnpm install

# 5. 确认三门禁可运行
pnpm check && pnpm test && pnpm build
```

**如果环境有问题，先解决环境再执行批次，不要在坏环境上改代码。**

### 2.2 单批次执行流程（严格按此顺序）

```
第1步：读取批次文件
  → Read docs/trae-batches/batch-XX.md
  → 确认前置依赖已完成（检查"前置条件检查"部分）

第2步：探查代码
  → 读取涉及文件的当前内容
  → 搜索相关组件/样式定义
  → 确认修改点的准确位置（不猜位置）

第3步：执行修改
  → 按"执行步骤"逐项操作
  → 优先引用语义令牌，不硬编码颜色/字号/时长
  → 每完成一个子步骤，快速验证不破坏现有功能

第4步：运行三门禁
  → pnpm check（类型检查）
  → pnpm test（单元测试）
  → pnpm build（构建）
  → 任何一项失败，立即修复，不要带着错误继续

第5步：人工验证（如可运行）
  → pnpm dev 启动开发服务器
  → 实际操作验证修改效果
  → 截图对比修改前后

第6步：登记变更
  → 更新 docs/change-log.md
  → 按模板填写变更记录

第7步：提交代码
  → git add 相关文件
  → git commit -m "feat(batch-XX): 批次名称 - 核心修改摘要"
  → git push origin agent/business-analysis-v1

第8步：标记完成
  → 在本文件总览表中将状态改为 ✅
  → 通知用户批次完成
```

### 2.3 三门禁验证标准

| 命令 | 检查内容 | 通过标准 |
|---|---|---|
| `pnpm check` | TypeScript 类型检查 | 0 error，warning 可接受但需记录 |
| `pnpm test` | 单元测试 | 全部通过，无失败用例 |
| `pnpm build` | 生产构建 | 构建成功，无 error |

**三门禁全绿是每个批次的硬性验收标准，不允许跳过。**

### 2.4 错误处理策略

| 错误类型 | 处理方式 |
|---|---|
| 类型错误（pnpm check 失败） | 立即修复类型，不要用 `any` 绕过 |
| 测试失败（pnpm test 失败） | 先理解测试意图，修复代码或更新测试（需说明原因） |
| 构建失败（pnpm build 失败） | 读取错误信息，定位具体文件和行号，修复后重跑 |
| 运行时白屏 | 检查控制台错误，回退最近修改，逐步定位 |
| 样式回归（某页面样式错乱） | 检查是否全局替换影响了该页面，添加作用域或特例 |
| 性能下降（动画卡顿） | 检查是否过度使用动画，添加 will-change 或减少动画层级 |

**回退策略：** 如果修改引发严重问题且短时间无法修复，使用 `git revert` 回退该批次，记录问题后继续下一批次，不要卡在一个问题上超过 30 分钟。

### 2.5 提交规范

**Commit Message 格式：**
```
<type>(batch-XX): <批次名称> - <核心修改摘要>

<详细修改内容，每行一个要点>

验收：三门禁全绿 | 变更已登记 | 批次XX完成
```

**Type 取值：**
- `feat`：新功能/新样式
- `fix`：修复问题
- `refactor`：重构（不改变功能）
- `style`：仅样式调整
- `docs`：文档更新

**示例：**
```
feat(batch-21): 可阅读性专项优化 - 全局字号统一为8级Type Scale

- 新增8级字号令牌（32/28/20/16/14/12/11/10px）
- 替换全局硬编码字号为令牌引用（106处小字号）
- 删除8px极端小字号5处，9px严重小字号24处
- 统一行高为1.5，长文本1.6，小字号1.4
- 底部导航字号从9px提升到10px

验收：三门禁全绿 | 变更已登记 | 批次21完成
```

### 2.6 AI Agent 最佳实践

1. **先读后写**：修改任何文件前，先 Read 完整内容，不要凭印象修改
2. **小步提交**：每个批次完成后立即提交，不要攒多个批次一起提交
3. **不硬编码**：颜色/字号/间距/时长/缓动全部引用令牌，不写死具体值
4. **保持作用域**：全局样式修改要注意不影响其他页面，必要时添加父级选择器
5. **保留注释**：复杂的 CSS 技巧（如 grid-template-rows 折叠）添加注释说明
6. **不跳过验证**：三门禁是硬性标准，任何一项失败都必须修复
7. **记录变更**：每个批次完成后更新 change-log.md，不要事后补写
8. **遇到不确定**：如果修改可能影响其他模块，先搜索全局使用情况，确认无冲突再改
9. **不引入新依赖**：除非批次明确要求，否则不安装新的 npm 包
10. **保持代码风格**：与现有代码风格一致（缩进/引号/分号/命名）

---

## 三、批次文件索引

每个批次有独立的详细指令文件，执行时按需读取：

| 批次 | 文件路径 | 核心内容 |
|---|---|---|
| 1 | [batch-01.md](batch-01.md) | C9 导航重构 |
| 2 | [batch-02.md](batch-02.md) | C11 页面 P0 修复 |
| 3 | [batch-03.md](batch-03.md) | C12 页面 P1 批量 6 项 |
| 4 | [batch-04.md](batch-04.md) | OTP 验证码修复 ✅ |
| 5 | [batch-05.md](batch-05.md) | C8 全局组件统一 ✅ |
| 6 | [batch-06.md](batch-06.md) | 设计令牌收敛 ✅ |
| 7 | [batch-07.md](batch-07.md) | 皮肤文件拆分 ✅ |
| 8 | [batch-08.md](batch-08.md) | 皮肤统一切换 ✅ |
| 9 | [batch-09.md](batch-09.md) | 皮肤中心页面 ✅ |
| 10 | [batch-10.md](batch-10.md) | 深色模式完善 ✅ |
| 11 | [batch-11.md](batch-11.md) | 全局配色与令牌打磨 ✅ |
| 12 | [batch-12.md](batch-12.md) | 全局组件打磨 |
| 13 | [batch-13.md](batch-13.md) | 登录/注册页打磨 |
| 14 | [batch-14.md](batch-14.md) | 工作台打磨 |
| 15 | [batch-15.md](batch-15.md) | 订单模块打磨 |
| 16 | [batch-16.md](batch-16.md) | 商品模块打磨 |
| 17 | [batch-17.md](batch-17.md) | 洞察模块打磨 |
| 18 | [batch-18.md](batch-18.md) | 我的模块打磨 |
| 19 | [batch-19.md](batch-19.md) | 图表专项优化 |
| 20 | [batch-20.md](batch-20.md) | 层级收纳专项优化 |
| 21 | [batch-21.md](batch-21.md) | 可阅读性专项优化 |
| 22 | [batch-22.md](batch-22.md) | Logo 区重构+融入过渡 |
| 23 | [batch-23.md](batch-23.md) | 全局过渡与动效优化 |

---

## 四、全局设计令牌参考

执行任何批次前，确认以下令牌已存在（批次 6 已创建）：

### 4.1 颜色令牌
```css
--sdq-bg-canvas / --sdq-bg-surface / --sdq-bg-elevated / --sdq-bg-brand-soft
--sdq-text-primary / --sdq-text-secondary / --sdq-text-tertiary / --sdq-text-inverse
--sdq-action-primary / --sdq-action-primary-hover / --sdq-action-primary-active
--sdq-border-subtle / --sdq-border-default / --sdq-border-strong
--sdq-success / --sdq-warning / --sdq-risk / --sdq-info
```

### 4.2 字号令牌（批次 21 完善）
```css
--sdq-font-display: 32px / --sdq-font-h1: 28px / --sdq-font-h2: 20px
--sdq-font-h3: 16px / --sdq-font-body: 14px / --sdq-font-caption: 12px
--sdq-font-micro: 11px / --sdq-font-chart: 10px
```

### 4.3 间距令牌
```css
--sdq-space-1: 4px / --sdq-space-2: 8px / --sdq-space-3: 12px
--sdq-space-4: 16px / --sdq-space-5: 20px / --sdq-space-6: 24px
--sdq-space-8: 32px / --sdq-space-10: 40px
```

### 4.4 动效令牌（批次 23 新增）
```css
--sdq-duration-instant: 80ms / --sdq-duration-fast: 160ms
--sdq-duration-standard: 220ms / --sdq-duration-slow: 320ms
--sdq-duration-entrance: 400ms
--sdq-ease-standard: cubic-bezier(.23,1,.32,1)
--sdq-ease-in / --sdq-ease-out / --sdq-ease-in-out
--sdq-spring: cubic-bezier(.34,1.56,.64,1)
```

### 4.5 圆角令牌
```css
--sdq-radius-sm: 8px / --sdq-radius-md: 12px / --sdq-radius-lg: 16px
--sdq-radius-xl: 20px / --sdq-radius-full: 9999px
```

---

## 五、完成标准（全部批次完成后）

1. **23 个批次全部执行完毕**，总览表状态全部为 ✅
2. **三门禁全绿**：最终 `pnpm check && pnpm test && pnpm build` 通过
3. **68 项完成标准全部达标**（详见各批次验收标准）
4. **5 种皮肤兼容**：aurora / soft / deep / midnight / forest 下样式正常
5. **减少动效适配**：`prefers-reduced-motion: reduce` 下动画禁用
6. **变更日志完整**：docs/change-log.md 记录所有批次变更
7. **线上验收**：合并 main 后发布到 app.3dq.site，用测试账号逐页复核

---

**文档维护：** 每完成一个批次，更新总览表状态和 change-log.md
**原始详细指令：** 参考 `docs/trae-execution-guide-2026-08-31.md`（V1 版，含完整 CSS 代码块）
