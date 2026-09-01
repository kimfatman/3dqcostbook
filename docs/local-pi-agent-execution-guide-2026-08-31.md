# 本地 PI Agent 逐批执行指令书 · 线上 UI 问题修复
**日期：** 2026-08-31 ｜ **执行者：** 本地 PI Agent ｜ **仓库：** kimfatman/3dqcostbook
**前置文档：** 《线上 UI 美观测试报告》17 项问题 × 《线上 UI 问题解决方案》× 《全局 UI/UX 升级优化总方案》
**仓库基线：** main 分支（C1–C7 已上线），新分支从 main 切出

---

## 通用规范（每批必须遵守）

### 分支与提交
```bash
# 每批从 main 切独立分支
git checkout main && git pull
git checkout -b agent/ui-fix-cN-<desc>

# 提交规范
git commit -m "fix(ui): <具体修复内容> (C<n>)"

# 合并前三门禁全绿
pnpm check && pnpm test && pnpm build
```

### 三门禁（每批必须全绿才能合并）
1. `pnpm check`（tsc --noEmit 类型检查）
2. `pnpm test`（vitest 全量测试，不得跳过）
3. `pnpm build`（vite build + esbuild 生产构建）

### 回归要求（每批必须新增）
- 每批至少新增 **3 项 DOM/功能回归测试**（对应修复的问题）
- 测试文件放在对应组件/页面的 `.test.tsx` 中
- 关键 UI 变更必须有断言（如标题文本、padding 值、按钮 className）

### 涉及的核心文件
| 文件 | 用途 |
|---|---|
| `client/src/pages/Home.tsx` | 主页面，包含所有 screen 路由（1607 行） |
| `client/src/components/SelfHostedAccessGate.tsx` | 登录/注册组件 |
| `client/src/components/DashboardLayout.tsx` | 工作台布局 |
| `client/src/components/ui/select.tsx` | 下拉组件（shadcn） |
| `client/src/components/ui/button.tsx` | 按钮组件 |
| `client/src/components/ui/badge.tsx` | 徽章组件 |
| `client/src/components/ui/empty.tsx` | 空态组件 |
| `client/src/lib/sd-design-tokens.css` | 设计令牌定义 |
| `client/src/index.css` | 全局样式 |
| `server/cloudbase-auth.ts` | CloudBase OTP 认证 |
| `server/auth-security.ts` | 认证安全/限流 |

---

## 批次 0：后端-P0 · OTP 验证修复（最高优先级）

**目标：** 修复 OTP 验证码发送成功但验证失败的问题，恢复新用户注册能力。

**涉及文件：**
- `server/cloudbase-auth.ts`
- `server/auth-security.ts`
- `server/auth-routes.security.test.ts`

### 任务清单

1. **排查 CloudBase OTP 验证接口**
   - 在 `server/cloudbase-auth.ts` 中找到 `completeCloudbaseOtpChallenge` 函数
   - 检查 challengeId 是否正确传递、verificationCode 格式是否正确
   - 检查 CloudBase 环境 ID/配置是否与生产环境一致
   - 打印完整错误日志（不得吞掉 CloudBase 返回的错误信息）

2. **修复验证失败的根因**
   - 根据排查结果修复（常见原因：challengeId 不匹配、验证码过期时间设置错误、CloudBase 环境配置错误）
   - 确保验证成功后正确返回 user/subject 信息

3. **错误提示具体化**
   - 验证失败时返回具体错误码：
     - `verification_code_invalid` → 前端显示"验证码错误，请重新输入"
     - `challenge_expired` → 前端显示"验证码已过期，请重新获取"
     - `challenge_not_found` → 前端显示"验证会话不存在，请重新获取验证码"
   - 在 `SelfHostedAccessGate.tsx` 中根据错误码显示对应提示

4. **"重新获取验证码"不跳页**
   - 在 `SelfHostedAccessGate.tsx` 中，点击"重新获取验证码"时：
     - 保持 `mode="register"`，不切换到 login
     - 保留所有表单状态（name/workspaceName/industryId/password/consentAgreed）
     - 清空 verificationCode，重置 otpChallenge
     - 启动 60s 倒计时

5. **新增回归测试**
   - OTP 验证成功路径测试
   - OTP 验证失败（验证码错误/过期）路径测试
   - 重新获取验证码保留表单状态测试

### 验收标准
- [ ] 用测试邮箱完整走通注册流程（获取验证码 → 输入 → 验证成功 → 创建店铺 → 自动登录）
- [ ] 验证码错误时显示"验证码错误，请重新输入"
- [ ] 重新获取验证码不跳页，表单状态保留
- [ ] `pnpm check && pnpm test && pnpm build` 全绿
- [ ] 新增 ≥3 项回归测试

### 预计工作量：1-2 人天

---

## 批次 1：C8 · 全局组件与空态

**目标：** 自定义下拉组件统一、空态组件全局复用、退款空态修复。

**涉及文件：**
- `client/src/components/ui/select.tsx`（已有，需确认样式统一）
- `client/src/components/ui/empty.tsx`（已有，需扩展三段式）
- `client/src/pages/Home.tsx`（订单详情退款空态）
- `client/src/components/SelfHostedAccessGate.tsx`（行业下拉）

### 任务清单

1. **行业下拉自定义组件统一**
   - 确认 `SelfHostedAccessGate.tsx` 中行业下拉使用 `client/src/components/ui/select.tsx`（shadcn Select），而非原生 `<select>`
   - 如果仍用原生 select，替换为 shadcn Select 组件
   - 统一样式：边框 1px `--sdq-border`、圆角 8px、高度 44px、聚焦态蓝色边框+阴影
   - 下拉箭头用 `ChevronDown` 图标（lucide-react）
   - 选项面板：白色背景+阴影、选项 hover 浅灰、选中态蓝色文字+Check 图标

2. **空态组件扩展为三段式**
   - 扩展 `client/src/components/ui/empty.tsx`，支持三段式 props：
     ```tsx
     <Empty
       icon={<RefundIcon />}
       title="暂无退款记录"          // 结果
       description="该订单未发生退款或退货"  // 原因
       action={{ label: "记一笔退款", onClick: handleRefund }}  // 行动（可选）
     />
     ```
   - 空态样式：浅灰背景 `--sdq-bg-subtle`、圆角 12px、内边距 24px、图标 40px、标题 14px 中等、描述 12px 辅助色

3. **订单详情退款空态修复**
   - 在 `Home.tsx` 中找到 `orderDetail` screen 的"退款与退货回收"卡片
   - 无退款时使用扩展后的 Empty 组件（三段式），替换空白卡片
   - 无退款时该卡片默认折叠（标题显示"退款与退货回收 · 暂无"，点击展开）
   - 有退款时显示完整明细

4. **新增回归测试**
   - 自定义下拉渲染测试（选项展开/选中/键盘导航）
   - 空态三段式渲染测试
   - 订单详情无退款时空态显示测试

### 验收标准
- [ ] 注册页行业下拉使用自定义组件，样式与全局输入框统一
- [ ] 空态组件支持三段式（结果-原因-行动）
- [ ] 订单详情无退款时显示三段式空态，非空白卡片
- [ ] `pnpm check && pnpm test && pnpm build` 全绿
- [ ] 新增 ≥3 项回归测试

### 预计工作量：0.5-1 人天

---

## 批次 2：C9 · 导航重构

**目标：** 修复 FAB 遮挡、详情页保留底部 Tab、FAB 按页面语义显示/隐藏。

**涉及文件：**
- `client/src/pages/Home.tsx`（FAB 渲染逻辑、底部导航、详情页）
- `client/src/components/DashboardLayout.tsx`（布局容器）
- `client/src/index.css`（FAB 样式、padding）

### 任务清单

1. **洞察页 FAB 遮挡修复（立即修复）**
   - 在 `Home.tsx` 中找到 `analysis` screen 的瀑布图容器
   - 增加 `padding-bottom: 96px`（确保瀑布图下方指标不被 FAB 遮挡）
   - 或给洞察页整体内容区增加 `padding-bottom: 96px`
   - 断言：瀑布图底部的"毛利/毛利率/费用率"指标完整可见

2. **详情页保留底部 Tab 导航**
   - 在 `Home.tsx` 中，`orderDetail` 和 `cardDetail` screen 当前可能隐藏了底部导航
   - 修改为：详情页**保留底部 Tab 导航**（与列表页一致）
   - 详情页**隐藏 FAB**（详情页不需要快捷记账）
   - 顶部保留返回按钮（←），点击返回上一级列表
   - 从详情页切换到其他 Tab 时，保留返回栈（返回时回到详情页）

3. **FAB 按页面语义显示/隐藏**
   - 定义 FAB 显示规则：
     - 工作台：显示（"+ 记一笔"）
     - 订单列表：显示
     - 商品列表：显示
     - 洞察页：**隐藏**（分析页不需要记账入口）
     - 我的页：隐藏
     - 详情页：隐藏
   - 在 `Home.tsx` 中根据当前 screen 条件渲染 FAB
   - FAB 显示/隐藏用可中断动画（apple-design：opacity + transform，200ms）

4. **FAB 位置统一**
   - FAB 固定在右下角，`bottom: 88px`（底部导航上方 8px）
   - `right: 16px`
   - 尺寸 56×56px（触控热区 ≥48pt）
   - 全局内容区统一增加 `padding-bottom: 96px`，避免任何页面内容被 FAB 遮挡

5. **新增回归测试**
   - 洞察页瀑布图容器 padding-bottom 断言
   - 详情页底部导航可见性断言
   - FAB 按页面显示/隐藏断言

### 验收标准
- [ ] 洞察页瀑布图底部指标完整可见，不被 FAB 遮挡
- [ ] 订单详情/商品详情页保留底部 Tab 导航
- [ ] 详情页隐藏 FAB
- [ ] 洞察页隐藏 FAB
- [ ] 全局内容区 padding-bottom: 96px
- [ ] `pnpm check && pnpm test && pnpm build` 全绿
- [ ] 新增 ≥3 项回归测试

### 预计工作量：1 人天

---

## 批次 3：C11 · 页面专项 P0

**目标：** 修复商品详情标题重复、工作台白色矩形空白。

**涉及文件：**
- `client/src/pages/Home.tsx`（cardDetail 标题、工作台经营概览卡）
- `client/src/components/DashboardLayout.tsx`（经营概览卡）

### 任务清单

1. **商品详情标题"商品商品成本详情"重复修复**
   - 在 `Home.tsx` 中找到 `cardDetail` screen 的页面标题
   - 检查标题拼接逻辑（ likely `商品 + 商品成本详情` 或 `商品 + 成本详情` 的 bug）
   - 修复为单一标题："商品成本详情"
   - 面包屑保留"商品 · 成本核算"
   - 全局审计其他页面标题是否有类似拼接 bug（搜索 `商品 +`、`订单 +` 等拼接模式）

2. **工作台经营概览卡底部白色矩形空白修复**
   - 在 `Home.tsx` 或 `DashboardLayout.tsx` 中找到经营概览卡（蓝色大卡）
   - 检查白色矩形区域：
     - 是否为未渲染的组件（如趋势图、指标卡）？检查条件渲染逻辑和数据绑定
     - 是否为固定高度的空白容器？移除固定高度，改为自适应
   - 修复后填入有价值的内容：
     - "较昨日"趋势：↑/↓ 箭头 + 变化幅度（如 "+¥133.96"）
     - 或利润率趋势迷你图（sparkline，使用现有 ChartTooltip 组件）
     - 或本月累计利润 / 目标完成度进度条
   - 如果暂无数据，显示空态提示："暂无数据，记一笔后查看经营趋势" + 引导按钮

3. **新增回归测试**
   - 商品详情标题文本断言（"商品成本详情"，不含重复）
   - 经营概览卡无空白区域断言（检查白色矩形元素不存在）
   - 经营概览卡趋势/空态内容渲染断言

### 验收标准
- [ ] 商品详情标题显示"商品成本详情"，无重复
- [ ] 工作台经营概览卡无白色矩形空白
- [ ] 经营概览卡填入趋势内容或空态提示
- [ ] 全局审计无其他标题拼接 bug
- [ ] `pnpm check && pnpm test && pnpm build` 全绿
- [ ] 新增 ≥3 项回归测试

### 预计工作量：0.5-1 人天

---

## 批次 4：C12 · 页面专项 P1（10 项批量修复）

**目标：** 批量修复 P1/P2 体验问题，统一组件层级和信息密度。

**涉及文件：**
- `client/src/pages/Home.tsx`（我的页、商品列表、商品详情、订单列表、订单详情、洞察页）
- `client/src/components/ui/button.tsx`（按钮变体）
- `client/src/components/ui/badge.tsx`（徽章样式）

### 任务清单

#### 4.1 我的页退出登录改中性
- 找到"我的"页的"退出登录"按钮
- 从红色描边+红色文字改为**中性文字按钮**（深灰文字 `--sdq-text-secondary`，无背景无描边）
- 点击后增加确认弹窗（使用 `alert-dialog.tsx`）："确定退出登录吗？" + 取消/确认
- 位置移到页面最底部，与账户信息视觉分离
- 红色仅保留给真正高破坏性操作（如"删除店铺"）

#### 4.2 商品列表标题改"商品管理"
- 找到商品页标题"商品成本卡"
- 改为"商品管理"
- 增加副标题："成本 · 售价 · 利润 · 库存"（12px 辅助色）
- Tab 标签保持"全部商品"/"关注"

#### 4.3 商品卡片增加库存/SKU/最近成交
- 找到商品卡片组件（在 Home.tsx 中）
- 增加第三行信息：`库存 {stock}件 · SKU: {sku} · 最近成交 {lastSaleDate}`
- 库存 <10 件时用**橙色文字**高亮，库存 =0 时红色
- 布局调整为三行：
  - 第一行：商品名 + 标签（成本上升/新品）
  - 第二行：单位成本 · 售价 · 单件利润（已有）
  - 第三行：库存 · SKU · 最近成交（新增）
- 如果后端暂无库存/SKU 数据，显示"—"占位，不报错

#### 4.4 商品详情"更多"按钮降权
- 找到商品详情页的三个按钮：编辑成本 / 测算定价 / 更多
- "编辑成本"：保持主按钮（蓝色填充 `--sdq-primary`）
- "测算定价"：保持次按钮（白色背景+蓝色描边+蓝色文字）
- "更多"：降为**文字按钮**（无背景无描边，仅蓝色文字 + `MoreHorizontal` 图标）
- "更多"点击弹出底部菜单（使用 `dropdown-menu.tsx` 或 `sheet.tsx`）：复制商品、删除商品、查看历史、导出成本卡
- 按钮排列：主按钮 + 次按钮在一行，"更多"在次按钮右侧

#### 4.5 订单卡片右侧空白修复
- 找到订单列表卡片
- 调整为**左右分栏布局**：
  - 左侧（60%）：订单号 + 客户名 + 标签（平台/无退款/待复核）
  - 右侧（40%）：金额（右对齐，大号，等宽字体）+ 下单时间 + 状态标签
- 金额数字**右对齐**，使用 `font-variant-numeric: tabular-nums`
- "待复核"标签用橙色背景+白色文字，"已完成"用绿色
- 右侧增加快捷操作：查看详情（`ChevronRight` 图标）

#### 4.6 "成本上升"徽章增强
- 找到商品卡片的"成本上升"徽章
- 改为**橙色背景 + 白色文字**（`--sdq-warning-bg` + `--sdq-warning-text`）
- 增加 `TrendingUp` 图标 + 上升幅度（如 "+12%"）
- 显示格式：`↑ 成本上升 +12%`
- 成本下降用绿色背景 + `TrendingDown` 图标
- 鼠标悬停显示详情气泡（使用 `tooltip.tsx`）："较上期成本上升 12%，主要因 {原因}涨价"
- 成本上升 >20% 时升级为红色徽章

#### 4.7 经营预算增加说明
- 找到"我的"页的"经营预算 ¥500.00"行
- 增加**灰色说明文字**（12px `--sdq-text-tertiary`）："月度经营预算上限，用于成本预警和保本测算"
- 增加 `Info` 图标，点击/悬停显示详细说明弹窗（使用 `tooltip.tsx` 或 `popover.tsx`）
- 预算超支时在工作台显示橙色预警横幅："本月成本已超预算 {x}%，请注意控制"

#### 4.8 订单详情 SKU 字号提升
- 找到订单详情页的 SKU 成交明细
- SKU 明细字号从当前（约 11-12px）提升到 **13px**
- SKU 编码（如 ECO-ISC）用**等宽字体**（`font-family: 'IBM Plex Mono', monospace`）
- 行高增加到 1.5-1.6
- 关键信息（数量、金额）用 **14px 加粗**
- SKU 行增加 hover 态（浅灰背景）

#### 4.9 商品详情图片上传区图标加深
- 找到商品详情页的"添加商品图片"上传区
- 图标颜色从浅蓝改为**中蓝**（`--sdq-primary`，#3B82F6）
- 上传区背景改为**浅灰**（`--sdq-bg-subtle`，#F9FAFB）
- 增加**虚线边框**（1px dashed `--sdq-border`，#D1D5DB）
- 图标尺寸增大到 **24px**
- 上传区文字"添加商品图片"14px，辅助文字"JPEG、PNG 或 WebP · 最大 5MB"12px 灰色
- 圆角 12px，内边距 24px

#### 4.10 洞察瀑布图增加图例
- 找到洞察页的利润构成瀑布图
- 瀑布图**顶部右对齐增加图例**：
  - 蓝色方块（12×12px）+ "收入/利润"
  - 深灰方块（12×12px）+ "成本/费用"
- 图例文字 12px 辅助色
- 鼠标悬停柱子显示 tooltip（使用现有 `ChartTooltip.tsx`）：项目名称 + 金额 + 占净营收比例 + 与上期对比
- 瀑布图下方增加结论文字（12px 辅助色）："本月净营收 ¥{x}，扣除成本费用后经营利润 ¥{y}，利润率 {z}%"

### 新增回归测试（每 2-3 项合并一批，共 ≥5 项）
- 退出登录按钮 className 断言（中性，非红色）
- 商品页标题文本断言（"商品管理"）
- 商品卡片第三行信息渲染断言
- "更多"按钮变体断言（文字按钮）
- 订单卡片金额右对齐断言
- 成本上升徽章 className 断言（橙色背景）
- 经营预算说明文字渲染断言
- SKU 字号样式断言（13px）
- 瀑布图图例渲染断言

### 验收标准
- [ ] 10 项 P1/P2 问题全部修复
- [ ] 按钮层级清晰（主/次/文字三级）
- [ ] 信息密度提升（商品卡/订单卡无大片空白）
- [ ] 徽章语义化（颜色+图标+文字）
- [ ] `pnpm check && pnpm test && pnpm build` 全绿
- [ ] 新增 ≥5 项回归测试

### 预计工作量：2-3 人天

---

## 后续批次（不在本次 17 项范围内，按需推进）

| 批次 | 内容 | 对应全局方案 |
|---|---|---|
| C10 | 图标体系：emoji→Lucide 迁移、图标 token、aria 补全 | 全局方案 C10 |
| C13 | 动效体系：--sdq-motion-* 令牌、按压反馈、可中断、reduced-motion | 全局方案 C13 |
| C14 | 暗色模式双轨：语义 token 双轨补全、对比度独立校验 | 全局方案 C14 |
| C15 | 性能与 PWA：真 sw.js + manifest、code splitting、CSS 收敛、WebP/懒加载 | 全局方案 C15 |

---

## 完成标准（全部批次完成后）

1. **17 项线上 UI 问题全部修复**（按本指令书逐批验证）
2. **三门禁全绿**：每批 `pnpm check && pnpm test && pnpm build` 通过
3. **回归测试覆盖**：新增 ≥20 项 DOM/功能回归测试
4. **生产发布**：合并 main 后按 Runbook 发布到 app.3dq.site
5. **线上验收**：发布后用测试账号逐页复核，确认 17 项问题在线上已修复
6. **文档更新**：更新《线上 UI 美观测试报告》标记已修复项，更新 DESIGN.md 记录组件变更

---

## 紧急联系

如遇以下情况，立即停止并反馈：
- 三门禁无法通过且非本次改动导致
- 发现数据丢失/账号异常等严重问题
- CloudBase 配置/密钥相关问题（不得擅自修改生产配置）
- 涉及生产环境写入/删除的操作

## References
[1] [线上 UI 美观测试报告](live-ui-beauty-audit-2026-08-31.md)（17 项问题）
[2] [线上 UI 问题解决方案](live-ui-solutions-2026-08-31.md)（每项 skill 依据+推荐方案）
[3] [全局 UI/UX 升级优化总方案](ui-ux-optimization-solution-2026-08-31.md)（C8-C15 批次定义）
[4] [C1-C7 UI 升级实施记录](design-system/ui-upgrade-implementation-record-2026-08-30.md)（既有工作流参考）
[5] [设计系统基线 DESIGN.md](design-system/DESIGN.md)（令牌/组件规范）
