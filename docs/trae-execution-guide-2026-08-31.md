# Trae AI 编程助手 · UI 改造执行指令书
**日期：** 2026-08-31 ｜ **仓库：** kimfatman/3dqcostbook ｜ **分支：** agent/business-analysis-v1
**使用方式：** 在 Trae 中打开仓库 → 切换到 agent/business-analysis-v1 分支 → 逐批复制下方指令到 Trae AI 助手 → 等待执行并验证 → 完成一批再做下一批

---

## 仓库当前状态

### 已完成修复（5 项，无需再做）
| 提交 | 修复内容 |
|---|---|
| `5495d6e` | P0 商品详情标题"商品商品成本详情"重复（修复 entityLabel 拼接） |
| `5495d6e` | P1 退出登录红色按钮→中性文字按钮（深灰+透明背景） |
| `5495d6e` | P0 FAB 遮挡→全局 .ledger-page-shell 增加 padding-bottom: 96px |
| `c090a34` | P1 "成本上升"徽章增强（醒目橙+边框+加粗） |
| `c090a34` | P1 图片上传区图标加深（浅灰背景+虚线边框+#3b82f6） |

### 关键文件
- `client/src/pages/Home.tsx`（主页面，1600+ 行，包含所有 screen 路由和组件）
- `client/src/index.css`（全局样式）
- `client/src/cashflow-filter.css`（布局/筛选样式）
- `client/src/lib/template-display.ts`（行业模板显示文案）
- `server/cloudbase-auth.ts`（CloudBase OTP 认证）

### 三门禁（每批必须全绿）
```bash
pnpm check    # tsc --noEmit 类型检查
pnpm test     # vitest 全量测试
pnpm build    # vite build 生产构建
```
每批完成后必须跑这三个命令，全绿才能提交。

---

## 批次 1：C9 导航重构（详情页底部 Tab + FAB 按页面隐藏）

### 目标
1. 订单详情/商品详情页保留底部 Tab 导航（当前可能隐藏了）
2. 详情页/洞察页/我的页隐藏 FAB（"+ 记一笔"）
3. FAB 仅在工作台/订单列表/商品列表显示

### Trae 指令（直接复制）

```
我需要修复导航问题，请按以下步骤操作：

1. 先读取 client/src/pages/Home.tsx，找到底部 Tab 导航的渲染逻辑（搜索 tabs 数组和底部导航渲染部分，大约在 1560 行附近）。

2. 找到 FAB（"+ 记一笔"浮动按钮）的渲染逻辑，搜索 "fixed-primary" 或 "list-primary" 或 "记一笔"。

3. 修改 FAB 渲染条件：
   - 当前 FAB 可能在所有页面都显示
   - 改为仅在以下页面显示：tab === "home"（工作台）、tab === "orders"（订单列表）、tab === "cards"（商品列表）且 subPage 为 null（列表页，非详情页）
   - 在以下页面隐藏：tab === "analysis"（洞察）、tab === "profile"（我的）、所有 subPage 不为 null 的详情页（orderDetail/cardDetail 等）

4. 检查详情页（orderDetail/cardDetail）是否隐藏了底部 Tab 导航：
   - 如果详情页隐藏了底部导航，修改为保留底部导航（与列表页一致）
   - 详情页顶部保留返回按钮（←）

5. FAB 显示/隐藏用 CSS transition（opacity + transform，200ms），不要生硬切换。

6. 修改完成后运行：pnpm check && pnpm test && pnpm build，确保全绿。

7. 新增 3 项回归测试：
   - 洞察页 FAB 不存在的断言
   - 详情页底部导航可见的断言
   - 工作台 FAB 存在的断言
```

### 验收标准
- [ ] 洞察页无 FAB
- [ ] 订单详情/商品详情页有底部 Tab 导航
- [ ] 详情页无 FAB
- [ ] 工作台/订单列表/商品列表有 FAB
- [ ] 三门禁全绿
- [ ] 新增 ≥3 项回归测试

---

## 批次 2：C11 页面 P0（工作台白色矩形 + 商品页标题改"商品管理"）

### 目标
1. 排查并修复工作台经营概览卡底部的白色矩形空白
2. 商品页标题从"商品成本卡"改为"商品管理"

### Trae 指令（直接复制）

```
我需要修复两个 P0 问题，请按以下步骤操作：

## 问题 1：工作台经营概览卡底部白色矩形空白

1. 读取 client/src/pages/Home.tsx，找到工作台（tab === "home"）的经营概览卡渲染逻辑。搜索 "经营概览" 或 "prototype-home" 或首页渲染部分。

2. 检查经营概览卡（蓝色大卡）底部是否有：
   - 未渲染的组件（条件渲染逻辑错误）
   - 固定高度的空白容器（height 固定但内容为空）
   - 加载失败的骨架屏

3. 修复白色矩形：
   - 如果是未渲染组件，修复条件渲染逻辑，填入"较昨日趋势"（↑/↓ 箭头 + 变化幅度）或利润率 sparkline
   - 如果是固定高度空白，移除固定高度改为自适应
   - 如果暂无数据，显示空态提示："暂无数据，记一笔后查看经营趋势" + 引导按钮

## 问题 2：商品页标题改"商品管理"

1. 读取 client/src/lib/template-display.ts，找到 costCardTitleByEntity 定义（大约第 4 行）。

2. 修改各行业标题：
   - 菜品: "菜品成本卡" → "菜品管理"
   - 商品: "商品成本卡" → "商品管理"
   - 服务项目: "服务项目成本卡" → "服务项目管理"
   - 货品: "货品成本卡" → "货品管理"
   - fallback: `${template.entityLabel}成本卡` → `${template.entityLabel}管理`

3. 同步修改受影响的引用：
   - description 字段：`管理${title}的成本与定价` → 如果 title 变为"商品管理"，会变成"管理商品管理的成本与定价"（重复），改为 `管理${template.entityLabel}的成本与定价`
   - SKU 页标题（Home.tsx 第 1106 行附近）：`SKU ${cardCopy.title}` → 改为 `SKU 管理` 或保持 `SKU ${template.entityLabel}`
   - imageManagementCopy：`${template.entityLabel}图片仅在${title}详情中管理` → 改为 `${template.entityLabel}图片仅在详情中管理`

4. 在商品列表页（Home.tsx 第 1285 行附近）标题下方增加副标题：
   `<p>成本 · 售价 · 利润 · 库存</p>`（12px 辅助色 #71859d）

5. 修改完成后运行：pnpm check && pnpm test && pnpm build，确保全绿。

6. 新增回归测试：
   - 商品页标题文本断言（"商品管理"）
   - 工作台经营概览卡无空白区域断言
   - 商品页副标题渲染断言
```

### 验收标准
- [ ] 工作台经营概览卡无白色矩形空白
- [ ] 商品页标题显示"商品管理"
- [ ] 商品页有副标题"成本 · 售价 · 利润 · 库存"
- [ ] SKU 页/description/图片文案无重复
- [ ] 三门禁全绿
- [ ] 新增 ≥3 项回归测试

---

## 批次 3：C12 页面 P1 批量修复（6 项）

### 目标
1. 订单卡片右侧空白→左右分栏布局
2. 商品详情"更多"按钮降权→文字按钮
3. 订单详情 SKU 字号提升到 13px
4. 经营预算增加说明文字
5. 洞察瀑布图增加图例
6. 订单详情退款空态→三段式空态

### Trae 指令（直接复制）

```
我需要批量修复 6 个 P1 体验问题，请逐项操作：

## 1. 订单卡片右侧空白→左右分栏

1. 读取 client/src/pages/Home.tsx，找到订单列表卡片渲染（搜索 "order-list" 或 "prototype-orders"，大约在订单页渲染部分）。

2. 当前订单卡信息仅在左侧，右侧大片空白。修改为左右分栏：
   - 左侧（60%）：订单号 + 客户名 + 标签（平台/无退款/待复核）
   - 右侧（40%）：金额（右对齐，大号，等宽字体）+ 下单时间 + 状态标签
   - 金额用 font-variant-numeric: tabular-nums，text-align: right
   - "待复核"标签用橙色背景+白色文字，"已完成"用绿色

3. 在 client/src/index.css 中找到 .prototype-orders .order-list > button 样式（大约 473 行），调整 grid-template-columns 为左右分栏布局。

## 2. 商品详情"更多"按钮降权

1. 读取 client/src/pages/Home.tsx，找到商品详情页（cardDetail）的三个按钮：编辑成本 / 测算定价 / 更多。

2. 修改按钮层级：
   - "编辑成本"：保持主按钮（蓝色填充，className 含 fixed-primary）
   - "测算定价"：保持次按钮（白色背景+蓝色描边）
   - "更多"：降为文字按钮（无背景无描边，仅蓝色文字 + MoreHorizontal 图标）
   - "更多"点击弹出底部菜单（用 dropdown-menu 或 sheet）：复制商品、删除商品、查看历史、导出成本卡

3. 如果当前三个按钮权重相同，修改"更多"按钮的 className 为文字按钮样式。

## 3. 订单详情 SKU 字号提升

1. 读取 client/src/pages/Home.tsx，找到订单详情页（orderDetail）的 SKU 成交明细渲染。

2. 在 client/src/index.css 中找到 SKU 明细相关样式，将字号从当前（约 11-12px）提升到 13px。
   - SKU 编码（如 ECO-ISC）用等宽字体：font-family: 'IBM Plex Mono', monospace
   - 行高增加到 1.5-1.6
   - 关键信息（数量、金额）用 14px 加粗

## 4. 经营预算增加说明文字

1. 读取 client/src/pages/Home.tsx，找到"我的"页（profile）的经营预算行（搜索 "经营预算" 或 "budget"）。

2. 在经营预算金额下方增加说明文字：
   `<p className="budget-hint">月度经营预算上限，用于成本预警和保本测算</p>`
   - 样式：12px，颜色 #71859d，margin-top: 4px

3. 增加 Info 图标（lucide-react 的 Info），点击/悬停显示详细说明。

## 5. 洞察瀑布图增加图例

1. 读取 client/src/pages/Home.tsx，找到洞察页（analysis）的利润构成瀑布图渲染（搜索 "analysis-waterfall-card" 或 "利润构成"，大约 1190 行）。

2. 在瀑布图卡片标题右侧增加图例：
   - 蓝色方块（12×12px，background: #087ff5）+ "收入/利润"
   - 深灰方块（12×12px，background: #374151）+ "成本/费用"
   - 图例文字 12px，颜色 #71859d，右对齐

3. 在瀑布图下方增加结论文字（12px 辅助色）：
   "本月净营收 ¥{x}，扣除成本费用 ¥{y}，经营利润 ¥{z}，利润率 {w}%"

## 6. 订单详情退款空态→三段式

1. 读取 client/src/pages/Home.tsx，找到订单详情页的"退款与退货回收"卡片。

2. 无退款时，当前显示空白卡片。修改为三段式空态：
   - 图标：RefundCcw 或 Undo2（lucide-react，24px，颜色 #9ca3af）
   - 标题："暂无退款记录"（14px，颜色 #374151）
   - 描述："该订单未发生退款或退货"（12px，颜色 #6b7280）
   - 空态背景：#f9fafb，圆角 12px，内边距 24px，居中

3. 无退款时该卡片默认折叠（标题显示"退款与退货 · 暂无"，点击展开）。

---

完成以上 6 项后：
1. 运行 pnpm check && pnpm test && pnpm build，确保全绿
2. 新增 ≥5 项回归测试（每项修复至少 1 个断言）
3. 提交：git commit -m "fix(ui): C12 P1批量修复（订单分栏+更多按钮+SKU字号+预算说明+瀑布图图例+退款空态）"
```

### 验收标准
- [ ] 6 项修复全部完成
- [ ] 订单卡左右分栏，金额右对齐
- [ ] "更多"按钮为文字按钮样式
- [ ] SKU 字号 13px，等宽字体
- [ ] 经营预算有说明文字
- [ ] 瀑布图有图例
- [ ] 退款空态为三段式
- [ ] 三门禁全绿
- [ ] 新增 ≥5 项回归测试

---

## 批次 4：后端 P0 · OTP 验证修复

### 目标
修复 OTP 验证码发送成功但验证失败的问题，恢复新用户注册能力。

### Trae 指令（直接复制）

```
我需要修复 OTP 验证码验证失败的问题，请按以下步骤操作：

1. 读取 server/cloudbase-auth.ts，找到 completeCloudbaseOtpChallenge 函数（或类似的 OTP 验证函数）。

2. 排查以下可能原因：
   - challengeId 是否正确传递到验证接口
   - verificationCode 格式是否正确（是否需要去除空格/转大写）
   - CloudBase 环境 ID/配置是否与生产环境一致
   - 是否吞掉了 CloudBase 返回的错误信息（增加 console.error 打印完整错误）

3. 修复验证失败的根因：
   - 根据排查结果修复代码
   - 确保验证成功后正确返回 user/subject 信息
   - 验证失败时返回具体错误码：
     * verification_code_invalid → "验证码错误，请重新输入"
     * challenge_expired → "验证码已过期，请重新获取"
     * challenge_not_found → "验证会话不存在，请重新获取验证码"

4. 读取 client/src/components/SelfHostedAccessGate.tsx（或登录组件），修改前端：
   - 根据后端返回的错误码显示对应提示文字
   - 错误提示内联显示在验证码输入框下方（红色 12px）
   - "重新获取验证码"点击时：
     * 保持 mode="register"，不切换到 login
     * 保留所有表单状态（name/workspaceName/industryId/password/consentAgreed）
     * 清空 verificationCode，重置 otpChallenge
     * 启动 60s 倒计时

5. 新增回归测试：
   - OTP 验证成功路径测试
   - OTP 验证失败（验证码错误/过期）路径测试
   - 重新获取验证码保留表单状态测试

6. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

7. 提交：git commit -m "fix(auth): OTP验证修复+错误提示具体化+重新获取不跳页"
```

### 验收标准
- [ ] OTP 验证成功路径正常
- [ ] 验证码错误/过期时显示具体错误提示
- [ ] 重新获取验证码不跳页，表单状态保留
- [ ] 三门禁全绿
- [ ] 新增 ≥3 项回归测试

---

## 批次 5：C8 全局组件与空态（可选，优先级较低）

### 目标
1. 行业下拉替换为自定义 Select 组件
2. 空态组件扩展三段式
3. 全局原生 select 替换

### Trae 指令（直接复制）

```
我需要优化全局组件，请按以下步骤操作：

1. 读取 client/src/components/ui/select.tsx（shadcn Select 组件），确认其 API。

2. 读取 client/src/components/SelfHostedAccessGate.tsx（注册页），找到行业下拉选择器。
   - 如果当前用原生 <select>，替换为 shadcn Select 组件
   - 统一样式：边框 1px #d1d5db，圆角 8px，高度 44px，聚焦态蓝色边框+阴影

3. 读取 client/src/components/ui/empty.tsx（空态组件），扩展为支持三段式：
   - icon: ReactNode（图标）
   - title: string（结果标题）
   - description: string（原因描述）
   - action?: { label: string; onClick: () => void }（行动按钮，可选）
   - 样式：浅灰背景 #f9fafb，圆角 12px，内边距 24px，居中

4. 全局搜索原生 <select> 的使用（grep "<select" client/src），逐步替换为 shadcn Select。
   - 优先替换注册页/设置页的下拉
   - 表单内的下拉可以保留原生（shadcn Select 在表单内可能有样式冲突）

5. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

6. 新增回归测试：
   - 自定义下拉渲染测试（选项展开/选中/键盘导航）
   - 空态三段式渲染测试

7. 提交：git commit -m "feat(ui): C8 全局组件优化（自定义下拉+三段式空态）"
```

---

## 批次 6：皮肤中心 · 阶段1 令牌收敛（消除硬编码颜色）

### 目标
全局扫描并消除组件中的硬编码颜色，所有组件只消费 `--sdq-*` 语义令牌。这是皮肤中心的基础——只有全部令牌化，换皮肤才能全局生效。

### Trae 指令（直接复制）

```
我需要全局消除硬编码颜色，请按以下步骤操作：

1. 先读取 client/src/sd-design-tokens.css，理解现有的语义令牌（--sdq-bg-* / --sdq-text-* / --sdq-border-* / --sdq-action-* / --sdq-profit / --sdq-cost / --sdq-risk / --sdq-info / --sdq-icon-* 等）。

2. 全局扫描 client/src 目录中的硬编码颜色：
   - 搜索 #[0-9a-fA-F]{3,8}（十六进制颜色）
   - 搜索 rgb( 和 rgba(
   - 排除：sd-design-tokens.css（令牌定义文件本身）、*.test.tsx（测试文件）
   - 重点文件：client/src/index.css（硬编码最多）、client/src/cashflow-filter.css、client/src/layout-unification.css、client/src/widescreen-c7.css

3. 逐个替换为语义令牌：
   - #087ff5 / #0880f7 / #1677ff → var(--sdq-action-primary) 或 var(--sdq-income)
   - #eaf5ff / #e6f1ff / #f2f7ff → var(--sdq-bg-brand-soft)
   - #ffffff → var(--sdq-bg-surface)
   - #f5f7fa / #f7f9fc / #f9fafb → var(--sdq-bg-canvas)
   - #212830 / #0b1836 / #172033 → var(--sdq-text-primary)
   - #576575 / #71859d / #6b7280 / #8b97a8 → var(--sdq-text-secondary)
   - #8f9dae / #9ca3af / #a1aaba → var(--sdq-text-tertiary)
   - #ebf0f4 / #e1e8f0 / #e4ebf2 → var(--sdq-border-subtle)
   - #20a779 / #079455 / #10b981 → var(--sdq-profit)
   - #f6a623 / #d97706 / #f59e0b → var(--sdq-cost)
   - #e8534f / #c83227 / #ef4444 → var(--sdq-risk)
   - #5acbfa / #3cb4ec → var(--sdq-info)
   - rgba(20,50,90,0.08) → var(--sdq-shadow-card)
   - 圆角：8px → var(--sdq-radius-sm)，12px → var(--sdq-radius-md)，16px → var(--sdq-radius-lg)

4. 如果发现缺少对应的语义令牌，在 sd-design-tokens.css 的 :root 和 .mobile-shell.skin-deep 中同时新增（浅色和深色双轨）。

5. 替换完成后验证：
   - grep -rn "#[0-9a-fA-F]\{3,8\}" client/src --include="*.css" --include="*.tsx" | grep -v "sd-design-tokens" | grep -v ".test."
   - 应该只剩极少或零个硬编码颜色

6. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

7. 提交：git commit -m "refactor(tokens): 全局消除硬编码颜色，组件统一消费--sdq-*语义令牌"
```

### 验收标准
- [ ] 组件 CSS/TSX 中无硬编码颜色（排除令牌定义文件和测试文件）
- [ ] 新增缺失的语义令牌（浅色+深色双轨）
- [ ] 三种皮肤（soft/deep/aurora）切换视觉正常
- [ ] 三门禁全绿

---

## 批次 7：皮肤中心 · 阶段2 皮肤定义拆分

### 目标
把 `sd-design-tokens.css` 拆分为 `tokens/`（原色阶+语义默认）和 `skins/`（每皮肤独立文件），新增 midnight 和 forest 皮肤。

### Trae 指令（直接复制）

```
我需要拆分皮肤定义文件，请按以下步骤操作：

1. 读取 client/src/sd-design-tokens.css 完整内容，理解三层结构：
   - 层一：原色阶原语（:root 中的 --sdq-blue-* / --sdq-neutral-* / --sdq-success-* 等）
   - 层二：语义令牌（:root 默认浅色 + .mobile-shell.skin-deep 深色 + .mobile-shell.skin-aurora 极光）
   - 层三：Tailwind v4 @theme 桥

2. 创建目录结构：
   mkdir -p client/src/tokens client/src/skins

3. 创建 client/src/tokens/primitives.css：
   - 从 sd-design-tokens.css 提取层一（原色阶原语）
   - 只包含 :root 中的 --sdq-blue-* / --sdq-neutral-* / --sdq-success-* / --sdq-warning-* / --sdq-danger-* / --sdq-info-*
   - 文件头部加注释：原色阶原语，所有皮肤共享，不可修改

4. 创建 client/src/tokens/semantic.css：
   - 从 sd-design-tokens.css 提取层二的 :root 默认语义令牌（soft 浅色）
   - 包含 --sdq-bg-* / --sdq-text-* / --sdq-border-* / --sdq-shadow-* / --sdq-action-* / --sdq-income/cost/profit/risk/info / --sdq-icon-* / --sdq-radius-* / --sdq-space-* / --sdq-font-*
   - 如果缺少圆角/间距/字体令牌，从 index.css 中提取常用值补充

5. 创建 client/src/tokens/tailwind-bridge.css：
   - 从 sd-design-tokens.css 提取层三（Tailwind @theme 桥）

6. 创建 client/src/skins/soft.css：
   - 从 semantic.css 复制默认语义令牌，包装在 .mobile-shell.skin-soft { ... } 中
   - 文件头部加皮肤元数据注释（名称/模式/作者）

7. 创建 client/src/skins/deep.css：
   - 从 sd-design-tokens.css 提取 .mobile-shell.skin-deep 的语义令牌
   - 包装在 .mobile-shell.skin-deep { ... } 中
   - 补全缺失的语义令牌（参考 soft.css 的完整令牌列表，deep 中缺失的用合理深色值补充）

8. 创建 client/src/skins/aurora.css：
   - 从 sd-design-tokens.css 提取 .mobile-shell.skin-aurora 的令牌
   - 包装在 .mobile-shell.skin-aurora { ... } 中

9. 创建 client/src/skins/midnight.css（新增，午夜黑纯黑深色）：
   - 基于 deep.css，修改关键值：
     --sdq-bg-canvas: #000000
     --sdq-bg-surface: #111111
     --sdq-bg-surface-subtle: #1a1a1a
     --sdq-bg-elevated: #1f1f1f
     --sdq-border-subtle: #2a2a2a
     --sdq-border-strong: #3a3a3a
   - 其他令牌参考 deep.css

10. 创建 client/src/skins/forest.css（新增，森林绿品牌色）：
    - 基于 soft.css，修改品牌主色：
      --sdq-action-primary: #20a779
      --sdq-action-primary-pressed: #1b8f68
      --sdq-bg-brand: #20a779
      --sdq-bg-brand-soft: #e8f8f2
      --sdq-income: #20a779
    - 注意：--sdq-profit 保持 #20a779（业务语义色保护），--sdq-cost/risk/info 不变
    - 其他令牌参考 soft.css

11. 修改 client/src/sd-design-tokens.css，改为只 import：
    @import "./tokens/primitives.css";
    @import "./tokens/semantic.css";
    @import "./tokens/tailwind-bridge.css";
    @import "./skins/soft.css";
    @import "./skins/deep.css";
    @import "./skins/aurora.css";
    @import "./skins/midnight.css";
    @import "./skins/forest.css";
    （保留原文件注释，说明已拆分）

12. 创建 client/src/skins/index.ts（皮肤注册表）：
    定义 SkinMeta 接口和 SKIN_REGISTRY 数组，包含 5 种官方皮肤的元数据：
    - soft: 清蓝，浅色，默认
    - deep: 深蓝，深色
    - aurora: 极光，浅色，玻璃拟态
    - midnight: 午夜黑，深色，纯黑
    - forest: 森林绿，浅色，绿色品牌
    每个包含 id/name/description/mode/author/previewColors（4个关键色）

13. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

14. 验证：手动切换 5 种皮肤（修改 workspace.visualSkin），确认每种皮肤视觉正常。

15. 提交：git commit -m "refactor(skins): 皮肤定义拆分到skins/目录，新增midnight和forest皮肤"
```

### 验收标准
- [ ] tokens/ 目录包含 primitives.css / semantic.css / tailwind-bridge.css
- [ ] skins/ 目录包含 5 种皮肤 CSS + index.ts 注册表
- [ ] sd-design-tokens.css 改为只 import
- [ ] 5 种皮肤切换视觉正常
- [ ] deep/midnight 深色令牌完整无缺失
- [ ] 三门禁全绿

---

## 批次 8：皮肤中心 · 阶段3 统一切换机制

### 目标
在根组件统一应用 `skin-{id}` class，替换当前分散的切换逻辑，切换时增加过渡动画。

### Trae 指令（直接复制）

```
我需要统一皮肤切换机制，请按以下步骤操作：

1. 读取 client/src/components/DashboardLayout.tsx 和 client/src/App.tsx（或 main.tsx），找到当前皮肤 class 的应用位置。
   - 搜索 "skin-deep"、"skin-soft"、"mobile-shell"、"visualSkin"
   - 确认当前 .mobile-shell 元素在哪里渲染

2. 在根组件（DashboardLayout 或 App）中，从 useCostBook() 获取 visualSkin：
   const { visualSkin } = useCostBook();

3. 在 .mobile-shell 元素上动态应用皮肤 class：
   <div className={`mobile-shell skin-${visualSkin}`}>
   （如果当前已经有类似逻辑，确认它正确应用了所有 5 种皮肤的 class）

4. 增加皮肤切换过渡动画：
   在 client/src/index.css 中为 .mobile-shell 增加：
   .mobile-shell {
     transition: background-color 0.2s ease, color 0.2s ease;
   }
   .mobile-shell * {
     transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
   }
   （注意：不要对 transform/opacity 以外的属性做过多过渡，可能影响性能。可以只对背景色和文字色做过渡。）

5. 确认 updateVisualSkin 函数（在 cost-book.ts 中）能正确切换所有 5 种皮肤：
   - 当前 VisualSkin 类型是 "aurora" | "soft" | "deep"
   - 需要扩展为 "aurora" | "soft" | "deep" | "midnight" | "forest"
   - 修改 client/src/lib/cost-book.ts 中的 VisualSkin 类型
   - 修改 normalizeState 中的皮肤校验数组，加入 midnight 和 forest
   - 修改 createSeedState 和 createEmptyState 的默认值（保持 "soft"）

6. 在外观设置页面（如果存在）或我的页面，增加皮肤切换入口：
   - 如果当前 appearance subPage 未实现，先创建一个简单的皮肤切换列表
   - 显示 5 种皮肤名称，点击切换
   - （完整的皮肤中心页面在下一批次实现）

7. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

8. 新增回归测试：
   - 根组件应用了正确的 skin-{id} class
   - VisualSkin 类型包含 5 种皮肤
   - updateVisualSkin 能正确切换并持久化

9. 提交：git commit -m "feat(skins): 统一皮肤切换机制，扩展为5种皮肤，增加过渡动画"
```

### 验收标准
- [ ] VisualSkin 类型扩展为 5 种（soft/deep/aurora/midnight/forest）
- [ ] 根组件统一应用 `skin-{id}` class
- [ ] 皮肤切换有 200ms 过渡动画
- [ ] 5 种皮肤均可切换并持久化
- [ ] 三门禁全绿
- [ ] 新增 ≥3 项回归测试

---

## 批次 9：皮肤中心 · 阶段4 皮肤中心页面

### 目标
实现完整的皮肤中心页面（替换 appearance），包含皮肤列表、实时预览、自定义编辑器、导入导出。

### Trae 指令（直接复制）

```
我需要实现皮肤中心页面，请按以下步骤操作：

1. 读取 docs/skin-center-design-2026-08-31.md，理解皮肤中心的完整设计（页面布局/皮肤卡片/实时预览/编辑器/持久化）。

2. 创建组件目录：
   mkdir -p client/src/components/skin-center

3. 创建 client/src/components/skin-center/SkinCard.tsx：
   - 皮肤卡片组件，props: skin: SkinMeta, isActive: boolean, onApply: () => void
   - 显示：4色预览条（primary/background/surface/text 色块）+ 名称 + 描述 + 模式标签（浅色/深色）
   - 已应用：显示"已应用 ✓"（禁用态）
   - 未应用：显示"应用"按钮
   - 自定义皮肤额外显示：编辑/复制/导出/删除按钮

4. 创建 client/src/components/skin-center/SkinPreview.tsx：
   - 迷你工作台实时预览组件
   - 用 CSS transform: scale(0.85) 缩小
   - 包含：迷你经营概览卡（大数字+趋势）+ 迷你订单数据（3指标）+ 迷你商品卡 + 底部Tab栏
   - 实时应用当前选中的皮肤（通过父组件传入 skinId，在预览容器上应用 skin-{id} class）

5. 创建 client/src/components/skin-center/ColorPicker.tsx：
   - 颜色选择器组件，props: value: string, onChange: (color: string) => void
   - 使用原生 <input type="color"> + 十六进制输入框
   - 显示当前颜色色块

6. 创建 client/src/components/skin-center/SkinEditor.tsx：
   - 自定义皮肤编辑器组件（弹窗或侧边抽屉）
   - 字段：名称、描述、基于哪个官方皮肤（下拉）
   - 关键颜色编辑：品牌主色/背景色/卡片背景/主文字/次文字/边框色（用 ColorPicker）
   - 圆角与间距：卡片圆角（滑块 4-24px）、基础间距（滑块 4-24px）
   - 实时预览：编辑时顶部显示迷你预览
   - 按钮：保存/取消
   - 保存时生成 overrides 对象 { "--sdq-action-primary": "#ff0000", ... }

7. 创建 client/src/pages/SkinCenter.tsx（或在 Home.tsx 中实现 skinCenter subPage）：
   - 页面布局（参考设计文档第四章）：
     - 顶部：返回按钮 + 标题"皮肤中心" + 描述
     - 预览区：SkinPreview 实时预览当前选中皮肤
     - 官方皮肤区：5个 SkinCard 网格
     - 我的自定义皮肤区：自定义皮肤卡片 + "创建自定义皮肤"按钮
     - 高级设置：跟随系统开关/降低动效开关/大字体模式开关
   - 皮肤选择逻辑：点击皮肤卡片 → 先预览（不立即应用）→ 点击"应用"才真正切换
   - 自定义皮肤持久化：localStorage key "sdq-custom-skins"
     - 结构：{ id, name, description, baseSkin, overrides, createdAt }[]
     - 应用自定义皮肤：先加载 baseSkin CSS，再用 document.documentElement.style.setProperty() 应用 overrides
   - 导入导出：导出为 JSON 文件下载，导入时读取 JSON 文件

8. 替换现有的 appearance subPage：
   - 在 Home.tsx 中，把 subPage === "appearance" 的渲染改为 SkinCenter 页面
   - 或者新增 subPage "skinCenter"，在我的页面增加"皮肤中心"入口

9. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

10. 新增回归测试：
    - SkinCard 渲染测试（预览色/名称/应用按钮）
    - 自定义皮肤 localStorage 持久化测试
    - 皮肤应用后根组件 class 变化测试

11. 提交：git commit -m "feat(skin-center): 皮肤中心页面（皮肤列表+实时预览+自定义编辑器+导入导出）"
```

### 验收标准
- [ ] 皮肤中心页面可访问（我的 → 皮肤中心）
- [ ] 5 种官方皮肤卡片显示正常（预览色/名称/描述/模式）
- [ ] 实时预览区正常工作（选中皮肤即时预览）
- [ ] 自定义皮肤创建/编辑/保存/删除正常
- [ ] 自定义皮肤 localStorage 持久化正常
- [ ] 皮肤导入导出（JSON）正常
- [ ] 高级设置（跟随系统/降低动效/大字体）UI 正常
- [ ] 三门禁全绿
- [ ] 新增 ≥5 项回归测试

---

## 批次 10：皮肤中心 · 阶段5 深色完善与对比度验证

### 目标
补全深色模式令牌，全局对比度验证达到 WCAG AA 标准。

### Trae 指令（直接复制）

```
我需要完善深色模式并验证对比度，请按以下步骤操作：

1. 深色令牌补全：
   - 读取 client/src/skins/deep.css 和 client/src/skins/midnight.css
   - 与 client/src/skins/soft.css 对比，找出 deep/midnight 中缺失的语义令牌
   - 补全所有缺失的令牌（圆角/间距/字体令牌在深浅模式下值相同，直接复制；颜色令牌用合理的深色值）
   - 重点检查：--sdq-bg-brand-soft / --sdq-bg-warning-soft / --sdq-bg-success-soft / --sdq-bg-danger-soft 在深色下是否有定义

2. 业务语义色深色可辨识性验证：
   - --sdq-profit (#20a779) 在深色背景下是否可辨识（对比度 ≥3:1）
   - --sdq-cost (#f6a623) 在深色背景下是否可辨识
   - --sdq-risk (#e8534f) 在深色背景下是否可辨识
   - --sdq-info (#5acbfa) 在深色背景下是否可辨识
   - 如果不可辨识，在深色皮肤中调整这些颜色的明度（但保持色相不变，如 #20a779 → #34d399）
   - 注意：浅色模式下的业务色保持不变

3. 全局对比度检查：
   - 安装或使用对比度检查工具（如果项目中有 axe-core 或类似工具）
   - 或者写一个简单的 Node 脚本，遍历所有语义令牌组合，计算对比度：
     * text-primary vs bg-canvas（应 ≥7:1）
     * text-secondary vs bg-canvas（应 ≥4.5:1）
     * text-tertiary vs bg-canvas（应 ≥3:1）
     * action-primary vs bg-surface（应 ≥4.5:1）
     * profit/cost/risk/info vs bg-surface（应 ≥3:1）
   - 对 soft 和 deep 两种皮肤分别检查
   - 输出不达标项列表

4. 修复不达标项：
   - 调整文字颜色或背景颜色，使对比度达标
   - 优先调整文字颜色（因为背景色是皮肤的主视觉）
   - 修复后重新运行对比度检查，直到全部达标

5. 组件级深色模式检查：
   - 手动在 deep 皮肤下遍历所有页面（工作台/订单/商品/洞察/我的/详情页）
   - 检查是否有：
     * 白色文字在白色背景上（不可见）
     * 硬编码颜色残留（在批次6中应该已消除，但可能有遗漏）
     * 边框在深色下不可见
     * 阴影在深色下过重或不可见
   - 修复发现的问题

6. 运行 pnpm check && pnpm test && pnpm build，确保全绿。

7. 新增对比度测试：
   - 在 client/src/lib/sd-design-tokens.test.ts 中增加对比度断言
   - 对关键令牌组合断言对比度 ≥ 阈值

8. 提交：git commit -m "fix(skins): 深色模式令牌补全+全局对比度验证达到WCAG AA"
```

### 验收标准
- [ ] deep/midnight 深色令牌完整（与 soft 令牌数量一致）
- [ ] 业务语义色在深色下可辨识（对比度 ≥3:1）
- [ ] 全局对比度达到 WCAG AA（正文 ≥4.5:1，非文本 ≥3:1）
- [ ] 所有页面在 deep 皮肤下无显示异常
- [ ] 对比度测试纳入自动化测试
- [ ] 三门禁全绿

---

## Trae 使用技巧

1. **先读后改**：每批指令都要求先读取相关文件，Trae 会自动读取并理解上下文
2. **分批执行**：不要一次性把所有批次都发给 Trae，做完一批验证后再做下一批
3. **三门禁**：每批完成后必须让 Trae 运行 `pnpm check && pnpm test && pnpm build`
4. **回归测试**：每批要求新增测试，Trae 会自动生成测试文件
5. **如果 Trae 卡住**：可以说"继续"或"刚才的修改有问题，请重新检查"
6. **查看 diff**：Trae 修改后可以在 git diff 中查看具体改动，确认无误再提交
7. **遇到报错**：把报错信息粘贴给 Trae，说"修复这个错误"

---

## UI 逐页打磨执行指令（批次 11-18，共 225 项问题）

> **来源**：docs/ui-polish-todo-2026-09-01.md（8 个模块全部方案完成）
> **审查标准**：每章 4 轮审查（Apple Design ×2 + ui-ux-pro-max ×2）
> **执行顺序**：必须从批次 11 开始（令牌是基础），逐批执行，每批三门禁全绿才能继续
> **每批完成后**：更新 docs/ui-polish-todo-2026-09-01.md 中对应模块的"执行状态"为"已执行"，并登记到 docs/change-log.md

---

### 批次 11：全局配色与令牌（基础层，28 项，P0×8 P1×12 P2×8）

#### 目标
新增图表专用令牌、补全语义色色阶、替换所有硬编码颜色、新增材质/动效/字体/阴影/层级令牌，为后续所有模块提供令牌基础。

#### 涉及文件
- `client/src/tokens/primitives.css`（原色阶）
- `client/src/tokens/semantic.css`（语义令牌）
- `client/src/skins/*.css`（5种皮肤）
- `client/src/pages/Home.tsx`（图表硬编码颜色替换）

#### Trae 指令（直接复制）

```
我需要升级全局配色与令牌系统，请按以下步骤操作：

## 第一步：补全原色阶（primitives.css）
1. 补全语义色色阶：success/warning/danger/info 每个颜色新增 50/100/200/300/400/700/800/900 共8阶（当前只有500/600），保持色相一致，明度从浅到深
2. 新增图表辅助色阶：紫色（violet-50~950，11阶）、青色（teal-50~950，11阶），供图表令牌引用
3. 新增 neutral-0 = #ffffff（纯白，用于 bg-surface）

## 第二步：新增语义令牌（semantic.css 的 :root 中）
1. 新增图表专用令牌（8个）：
   --sdq-chart-1: var(--sdq-action-primary);  /* 主色蓝 */
   --sdq-chart-2: var(--sdq-info);             /* 浅蓝 */
   --sdq-chart-3: var(--sdq-profit);           /* 绿 */
   --sdq-chart-4: var(--sdq-cost);             /* 橙 */
   --sdq-chart-5: var(--sdq-risk);             /* 红 */
   --sdq-chart-6: var(--sdq-violet-500);      /* 紫 */
   --sdq-chart-7: var(--sdq-teal-500);         /* 青 */
   --sdq-chart-8: var(--sdq-text-tertiary);    /* 灰 */
   --sdq-chart-grid: color-mix(in srgb, var(--sdq-border-subtle), transparent 50%);
   --sdq-chart-tooltip-bg: var(--sdq-bg-elevated);

2. 新增玻璃材质令牌：
   --sdq-bg-glass: color-mix(in srgb, var(--sdq-bg-surface), transparent 6%);
   --sdq-bg-glass-strong: color-mix(in srgb, var(--sdq-bg-surface), transparent 3%);
   --sdq-backdrop-blur: 16px;

3. 新增动效令牌：
   --sdq-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
   --sdq-ease-standard: cubic-bezier(0.2, 0, 0, 1);
   --sdq-ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1);
   --sdq-duration-fast: 150ms;
   --sdq-duration-normal: 250ms;
   --sdq-duration-slow: 400ms;

4. 新增字体令牌：
   --sdq-font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
   --sdq-font-display: var(--sdq-font-body);
   --sdq-font-numeric: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
   --sdq-text-xs: 10px;
   --sdq-text-sm: 11px;
   --sdq-text-base: 12px;
   --sdq-text-lg: 14px;
   --sdq-text-xl: 16px;
   --sdq-text-2xl: 20px;
   --sdq-text-3xl: 28px;
   --sdq-leading-tight: 1.2;
   --sdq-leading-normal: 1.5;
   --sdq-leading-relaxed: 1.7;
   --sdq-tracking-tight: -0.05em;
   --sdq-tracking-normal: 0;
   --sdq-tracking-relaxed: 0.04em;

5. 新增阴影/层级/线宽/不透明度/焦点令牌：
   --sdq-shadow-elevated: 0 8px 24px color-mix(in srgb, var(--sdq-neutral-900), transparent 88%);
   --sdq-shadow-brand: 0 8px 20px color-mix(in srgb, var(--sdq-action-primary), transparent 78%);
   --sdq-shadow-inset: inset 0 1px 0 color-mix(in srgb, var(--sdq-neutral-0), transparent 15%);
   --sdq-shadow-none: none;
   --sdq-z-base: 0;
   --sdq-z-dropdown: 1000;
   --sdq-z-sticky: 1100;
   --sdq-z-fab: 1200;
   --sdq-z-modal: 1300;
   --sdq-z-toast: 1400;
   --sdq-border-width-thin: 1px;
   --sdq-border-width-medium: 2px;
   --sdq-border-width-thick: 3px;
   --sdq-opacity-disabled: 0.58;
   --sdq-opacity-hover: 0.92;
   --sdq-opacity-pressed: 0.85;
   --sdq-focus-ring: 0 0 0 3px color-mix(in srgb, var(--sdq-action-primary), transparent 84%);

6. 在 semantic.css 中加注释标注业务语义色保护：
   /* 业务语义色保护：以下令牌不可随皮肤修改，所有皮肤必须引用相同原色阶 */
   /* --sdq-profit / --sdq-cost / --sdq-risk / --sdq-info */

## 第三步：替换硬编码颜色（semantic.css）
将以下硬编码 hex 替换为原色阶引用：
- --sdq-bg-surface: #ffffff → var(--sdq-neutral-0)
- --sdq-bg-surface-subtle: #f2f7ff → var(--sdq-blue-50)
- --sdq-bg-elevated: #ffffff → var(--sdq-neutral-0)
- --sdq-bg-brand-soft: #e6f1ff → var(--sdq-blue-50)
- --sdq-bg-warning-soft: #fff4e1 → var(--sdq-warning-50)
- --sdq-bg-success-soft: #e8f8f2 → var(--sdq-success-50)
- --sdq-bg-danger-soft: #fdedec → var(--sdq-danger-50)
- --sdq-text-on-brand: #ffffff → var(--sdq-neutral-0)
- --sdq-shadow-card: 0 4px 16px rgba(20,50,90,0.08) → 0 4px 16px color-mix(in srgb, var(--sdq-neutral-900), transparent 92%)
- --sdq-overlay-scrim: rgba(18,31,53,0.42) → color-mix(in srgb, var(--sdq-neutral-950), transparent 58%)

## 第四步：替换图表硬编码颜色（Home.tsx）
搜索 Home.tsx 中的所有 hex 颜色，替换为图表令牌：
- #087ff5 / #087FF5 → var(--sdq-chart-1)（在 CSS 类中定义，SVG stopColor 改为用 CSS 类控制 fill/stroke）
- #0b1836 / #0b1836 → var(--sdq-chart-2)
- #9dddff → var(--sdq-chart-2)
- #cfe2ff → var(--sdq-blue-100)
- #8ca0b3 → var(--sdq-chart-8)
- costRingColors 数组（7色）→ 改为引用 --sdq-chart-1 ~ --sdq-chart-7
- stackAreaColors 数组（8色）→ 改为引用 --sdq-chart-1 ~ --sdq-chart-8
- tone = "#087ff5" → 改为 CSS 类控制

注意：SVG 的 stopColor 不能直接用 var()，需要改为用 CSS 类控制 <stop> 的 stop-color 属性，或者用 CSS 变量在 style 中设置。推荐方式：给每个 <stop> 加 className，在 CSS 中定义 .chart-stop-1 { stop-color: var(--sdq-chart-1); }

## 第五步：深色皮肤令牌覆盖（deep.css 和其他皮肤）
1. 在 .mobile-shell.skin-deep 中新增图表令牌深色版本：
   --sdq-chart-1: var(--sdq-blue-400);
   --sdq-chart-2: var(--sdq-info-400); （如果有 info-400，否则用 info-500）
   --sdq-chart-6: var(--sdq-violet-400);
   --sdq-chart-7: var(--sdq-teal-400);
   其他图表令牌保持原色阶引用
2. 将 deep.css 中的硬编码 hex 替换为原色阶引用：
   - --sdq-bg-surface: #151f31 → var(--sdq-neutral-900)（或新增 blue-950）
   - --sdq-bg-brand-soft: #123b70 → var(--sdq-blue-900)
   - --sdq-bg-warning-soft: #4a3514 → var(--sdq-warning-900)
   - --sdq-bg-success-soft: #123b32 → var(--sdq-success-900)
   - --sdq-bg-danger-soft: #4a2023 → var(--sdq-danger-900)
   - --sdq-shadow-card: rgba(0,0,0,0.24) → color-mix(in srgb, #000000, transparent 76%)
   - --sdq-overlay-scrim: rgba(0,0,0,0.62) → color-mix(in srgb, #000000, transparent 38%)
3. 非颜色令牌（radius/space/font/motion）从 :root 继承，删除 deep.css 中的重复声明
4. 对 aurora.css/midnight.css/forest.css 做同样的硬编码替换

## 第六步：验证
1. 运行 pnpm check && pnpm test && pnpm build，三门禁全绿
2. 启动开发服务器，切换5种皮肤，确认所有页面颜色正常
3. 检查图表在深色皮肤下颜色是否正确变化
4. 确认没有遗留的硬编码 hex/rgb 颜色（grep 搜索）

## 注意事项
- 原色阶文件（primitives.css）所有皮肤共享，不可修改现有颜色值，只能新增
- 业务语义色（profit/cost/risk/info）在所有皮肤下必须引用相同原色阶，不可改色相
- 图表令牌的深色版本只调整明度，不改色相
- SVG stopColor 的 var() 替代方案需要测试兼容性
```

#### 验收标准
- [ ] 新增 --sdq-chart-1~8 图表令牌（浅色+深色双轨）
- [ ] 补全语义色色阶（4色×8阶=32个）
- [ ] 新增图表辅助色阶（紫色/青色各11阶）
- [ ] 新增玻璃材质/动效/字体/阴影/层级/线宽/不透明度/焦点令牌
- [ ] semantic.css 硬编码 hex 全部替换为原色阶引用
- [ ] Home.tsx 图表硬编码颜色全部替换为图表令牌
- [ ] 5种皮肤硬编码 hex 全部替换
- [ ] 业务语义色标注"不可随皮肤修改"
- [ ] 深色皮肤非颜色令牌从:root继承
- [ ] 三门禁全绿
- [ ] 5种皮肤下所有页面颜色正常

---

### 批次 12：全局组件（30 项，P0×8 P1×14 P2×8）

#### 目标
收敛 CSS 重复定义、统一组件状态（hover/active/disabled/focus）、补全组件入场动画、统一空态/Toast/弹窗规范。

#### 涉及文件
- `client/src/index.css`（全局样式，CSS重复定义收敛）
- `client/src/pages/Home.tsx`（组件动效/hover）

#### Trae 指令（直接复制）

```
我需要升级全局组件系统，请按以下步骤操作：

## 第一步：收敛 CSS 重复定义（index.css）
搜索以下类名的所有定义，收敛为单一权威定义，删除重复/旧定义：

1. .tabbar（当前4个定义）：
   - 收敛为单一权威定义，位置固定底部，居中，宽度 min(100%, 430px)
   - 背景改为 var(--sdq-bg-glass)，backdrop-filter: blur(var(--sdq-backdrop-blur))
   - 按钮文字统一为 var(--sdq-text-sm)（11px），active 态用 var(--sdq-action-primary)
   - active 态背景 var(--sdq-bg-brand-soft)，加过渡 transition: all var(--sdq-duration-fast) var(--sdq-ease-standard)
   - z-index 改为 var(--sdq-z-sticky)

2. .segment-control（当前3个定义）：
   - 收敛为单一权威定义，grid 布局，padding: 3px，背景 var(--sdq-bg-canvas)，圆角 12px
   - 按钮 active 态背景 var(--sdq-bg-surface)，阴影 var(--sdq-shadow-card)
   - 加过渡 transition: all var(--sdq-duration-normal) var(--sdq-ease-standard)

3. .empty-state（当前5个定义）：
   - 收敛为单一权威定义，padding: 25px 14px，背景 var(--sdq-bg-surface)
   - 边框 var(--sdq-border-subtle)，圆角 14px，文字居中
   - 加入场动画 animation: fade-in-up var(--sdq-duration-normal) var(--sdq-ease-standard) both

4. .search-field（当前2个定义）：
   - 收敛为单一权威定义，focus-within 光晕统一为 var(--sdq-focus-ring)

5. .app-toast（当前2个定义）：
   - 收敛为单一权威定义，位置 bottom: calc(env(safe-area-inset-bottom) + 88px)
   - 圆角 12px，背景 var(--sdq-text-primary)，文字 var(--sdq-bg-surface)
   - z-index 改为 var(--sdq-z-toast)
   - 加入场动画 animation: toast-in var(--sdq-duration-normal) var(--sdq-ease-spring) both

6. .sub-intro（当前2个定义）：
   - 收敛为单一权威定义，h1 字号统一：默认 var(--sdq-text-3xl)（28px），compact 27px

## 第二步：统一按钮状态规范
1. .fixed-primary：
   - hover 背景改为 color-mix(in srgb, var(--sdq-action-primary), black 8%)（亮度+5%）
   - active 保持 scale(.98)，加过渡 transition: all var(--sdq-duration-fast) var(--sdq-ease-standard)
   - disabled 状态 opacity: var(--sdq-opacity-disabled)
   - focus-visible 轮廓改为 var(--sdq-focus-ring)

2. 所有可点击卡片（.ledger-surface / .record-row / .cost-card-list > button 等）：
   - hover 背景 var(--sdq-bg-canvas)，阴影 var(--sdq-shadow-elevated)
   - 左侧加 3px var(--sdq-action-primary) 指示条（hover 时显示）
   - 加过渡 transition: all var(--sdq-duration-fast) var(--sdq-ease-standard)

3. 表单输入框：
   - focus 光晕统一为 var(--sdq-focus-ring)
   - 加过渡 transition: border-color var(--sdq-duration-fast) var(--sdq-ease-standard), box-shadow var(--sdq-duration-fast) var(--sdq-ease-standard)

## 第三步：补全组件入场动画
在 index.css 中新增以下动画关键帧和类：

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 卡片 stagger 入场工具类 */
.stagger-in > * {
  animation: fade-in-up var(--sdq-duration-normal) var(--sdq-ease-standard) both;
}
.stagger-in > *:nth-child(1) { animation-delay: 0ms; }
.stagger-in > *:nth-child(2) { animation-delay: 50ms; }
.stagger-in > *:nth-child(3) { animation-delay: 100ms; }
.stagger-in > *:nth-child(4) { animation-delay: 150ms; }
.stagger-in > *:nth-child(5) { animation-delay: 200ms; }
.stagger-in > *:nth-child(n+6) { animation-delay: 250ms; }

## 第四步：弹窗/抽屉动画
1. .voucher-guard-layer（凭证放弃确认弹窗）：
   - backdrop 加 fade-in 动画（0.2s）
   - .voucher-guard-card 加 modal-in 动画（0.25s spring）
2. 所有弹窗/抽屉统一使用 modal-in 动画

## 第五步：空态组件统一
1. .empty-state 统一三段式结构：图标（48px）+ 标题（14px加粗）+ 描述（12px）+ 行动按钮（44px）
2. .home-chart-empty 统一为相同结构
3. 空态行动按钮样式统一：min-height: 44px，背景 var(--sdq-action-primary)，文字 var(--sdq-text-on-brand)

## 第六步：顶部栏滚动隐藏（可选，P2）
如果实现成本可控，给顶部栏加滚动隐藏效果：
- 向下滚动时隐藏（translateY(-100%)），向上滚动时显示
- 过渡 0.3s ease
- 如果实现复杂，跳过此项，保持固定顶部栏

## 第七步：验证
1. 运行 pnpm check && pnpm test && pnpm build
2. 检查所有页面的 tabbar/segment-control/empty-state/search-field/app-toast/sub-intro 样式一致
3. 测试按钮 hover/active/disabled/focus 状态
4. 测试卡片 hover 反馈
5. 测试空态/Toast/弹窗入场动画
6. 切换5种皮肤，确认组件样式正常
7. 开启 prefers-reduced-motion，确认所有动画禁用

## 注意事项
- CSS 重复定义收敛时，保留最完整的定义，删除其他重复定义
- 不要删除被其他地方引用的类名
- 动画必须加 prefers-reduced-motion 适配
- 按钮 hover 亮度变化不要太大（+5%即可），避免刺眼
```

#### 验收标准
- [ ] CSS 重复定义收敛为单一权威定义（tabbar/segment-control/empty-state/search-field/app-toast/sub-intro）
- [ ] tabbar 背景改玻璃材质，文字 11px，z-index 用语义令牌
- [ ] fixed-primary hover 有亮度变化，disabled 有 opacity
- [ ] 可点击卡片 hover 有背景+阴影+指示条
- [ ] 表单输入框 focus 光晕统一
- [ ] 新增 fade-in-up/toast-in/modal-in/shimmer 动画
- [ ] 新增 stagger-in 工具类
- [ ] 弹窗/抽屉有入场动画
- [ ] 空态统一三段式结构
- [ ] 所有动画有 prefers-reduced-motion 适配
- [ ] 三门禁全绿
- [ ] 5种皮肤下组件样式正常

---

### 批次 13：登录/注册 + 工作台（44 项，P0×9 P1×20 P2×15）

#### 目标
修复登录/注册页 24 项问题 + 工作台 20 项问题，重点：图表硬编码颜色替换、入场动画、hover反馈、标题简洁度。

#### 涉及文件
- `client/src/pages/SelfHostedAccessGate.tsx`（登录/注册页）
- `client/src/pages/Home.tsx`（工作台）
- `client/src/index.css`（样式）

#### Trae 指令（直接复制）

```
我需要修复登录/注册页和工作台的UI问题，请按以下步骤操作：

## 第一部分：登录/注册页（24项）

### P0（5项）
1. 页面入场动画：给 .selfhost-access-gate 加 fade-in-up 动画（0.4s spring），hero区和表单区stagger延迟
2. mode切换（登录/注册）过渡：加 opacity+transform 过渡（0.3s ease），切换时内容fade-out→fade-in
3. 验证码区域过渡：验证码输入框出现/消失加 height+opacity 过渡（0.25s ease）
4. prefers-reduced-motion：所有动画加 @media (prefers-reduced-motion: reduce) 禁用
5. 错误背景色：检查 .field-error 的背景色，确保用 var(--sdq-bg-danger-soft) 而非硬编码

### P1（11项）
6. 协议弹窗spring动画：协议条款弹窗加 modal-in 动画（0.3s spring）
7. 错误入场动画：错误提示加 fade-in-up 动画（0.2s）
8. 密码按钮加宽：显示/隐藏密码按钮 min-height 改为 44px，加文字"显示"/"隐藏"
9. 验证码自动聚焦：验证码输入框出现时自动 focus
10. aria-invalid：输入框错误时加 aria-invalid="true"
11. autofill样式：给 input:-webkit-autofill 加样式，保持背景色一致
12. 复选框加大：协议复选框 min-width/min-height 改为 20px，加 focus 样式
13. 宽屏左右分栏：≥768px 时改为左右分栏（hero 50% + 表单 50%）
14. 提交按钮spinner：提交时按钮显示 loading spinner，禁用点击
15. 深色hero验证：检查深色皮肤下 hero 区文字对比度

### P2（8项）
16. 标题简洁：登录页标题"登录你的账户"→"登录"，注册页"创建你的店铺"→"注册"
17. hero轨道旋转：hero 区背景装饰加缓慢旋转动画（20s linear infinite）
18. 切换:active：mode切换按钮加 :active scale(.97)
19. 按钮hover：提交按钮 hover 亮度+5%
20. 错误图标：错误提示前加 CircleAlert 图标
21. 卡片圆角：表单卡片圆角统一为 16px
22. 输入框高度统一：所有输入框 min-height 统一为 44px
23. 密码强度指示：密码输入框下方加强度指示（弱/中/强）

## 第二部分：工作台（20项）

### P0（4项）
1. 图表硬编码颜色替换：
   - Home.tsx 第238行 stopColor="#087ff5" → 改CSS类控制，用 var(--sdq-chart-1)
   - 第271行 stopColor="#0b1836" → var(--sdq-chart-2)
   - 第1334行 stopColor="#9dddff" → var(--sdq-chart-2)
   - 第243行 const tone = "#087ff5" → 改CSS类控制
   - 第292行 costRingColors 数组 → 改引用 --sdq-chart-1 ~ --sdq-chart-7
   - 第353行 stackAreaColors 数组 → 改引用 --sdq-chart-1 ~ --sdq-chart-8
   - 第317行 饼图"其他"背景 "#8ca0b3" → var(--sdq-chart-8)
   注意：SVG stopColor 不能直接用 var()，需要给 <stop> 加 className，在 CSS 中定义 stop-color

2. 经营概览卡深色皮肤兼容：
   - .operating-snapshot 背景当前用 --sdq-text-primary，深色皮肤下异常
   - 改为 --sdq-bg-brand 或专用 --sdq-snapshot-bg，深色皮肤下保持深色
   - 检查文字颜色在深色皮肤下可读

3. 促销轮播背景不一致：
   - 前2个 slide 背景 --sdq-text-primary，第3个 --sdq-action-primary
   - 统一为 --sdq-action-primary 渐变，或三个 slide 用同色系不同明度

4. 成本环第6/7色对比度不足：
   - costRingColors 第6色 #b9d7ee、第7色 #667085 对比度<3:1
   - 减少到5色（前5色对比度达标），或调整为对比度≥3:1的颜色

### P1（9项）
5. 柱状图入场动画：销售动能柱状图加 height 从0到目标值的 spring 动画，stagger 延迟（每根柱30ms）
6. 环形图入场动画：成本环/销售目标环加 conic-gradient 旋转展开或 stroke-dashoffset 动画
7. 图表hover高亮：hover 时柱子亮度+8%、数据点放大、显示 Tooltip
8. 网格线SVG化：销售动能图网格线从 repeating-linear-gradient 改为 SVG line，用 --sdq-chart-grid
9. 数据点放大：非当前点 r=2.2，当前点 r=3.5，hover r=4.5（当前 r=1.65-2.8）
10. Tooltip全覆盖：瀑布图/排行/环形图加 Tooltip，统一组件
11. 标题简洁："钱花在哪里"→"成本结构"，"本月销售目标"→"销售目标"（月份放副标题）
12. 数字字号统一：经营概览卡主数字 22px，指标数字 12px，统一字距 -0.06em
13. 图例补全：瀑布图/成本环加图例，位置统一（标题右侧）

### P2（7项）
14. 瀑布图柱子圆角统一为 6px 6px 4px 4px
15. 图表卡片间距统一为 12px
16. 销售动能 X 轴标签跨月时显示"8/15"格式
17. 商品排行条形图加 width 从0到目标值 spring 动画
18. 图表空态前加 200ms shimmer 骨架屏
19. 经营概览卡趋势箭头颜色：上升=profit绿，下降=risk红
20. 促销轮播 5s 自动轮播，hover 暂停，reduced-motion 禁用

## 验证
1. pnpm check && pnpm test && pnpm build
2. 登录/注册页：测试登录/注册切换、验证码、错误提示、协议弹窗、宽屏布局
3. 工作台：检查所有图表颜色在5种皮肤下正常，入场动画流畅，hover反馈正常
4. 检查标题简洁度，无啰嗦/重复标题
5. prefers-reduced-motion 下所有动画禁用
```

#### 验收标准
- [ ] 登录/注册页 24 项问题全部修复
- [ ] 工作台 20 项问题全部修复
- [ ] 图表硬编码颜色全部替换为 --sdq-chart-* 令牌
- [ ] 经营概览卡在 5 种皮肤下可读
- [ ] 柱状/环形/瀑布图加入场动画
- [ ] 图表 hover 高亮 + Tooltip 全覆盖
- [ ] 成本环配色对比度≥3:1
- [ ] 标题简洁度优化
- [ ] 减少动效适配
- [ ] 三门禁全绿

---

### 批次 14：订单模块（28 项，P0×7 P1×12 P2×9）

#### 目标
修复订单列表/详情/表单/退款表单 28 项问题，重点：字号不达标、触控区不足、字符图标替换、布局优化。

#### 涉及文件
- `client/src/pages/Home.tsx`（OrdersPage/OrderDetailPage/OrderFormPage/RefundFormPage）
- `client/src/index.css`（样式）

#### Trae 指令（直接复制）

```
我需要修复订单模块的UI问题，请按以下步骤操作：

## P0（7项）
1. 字号不达标：
   - 订单卡片订单号 11px → 12px（.prototype-orders .order-list > button > div > b）
   - 订单卡片标签 9px → 10px（.prototype-orders .order-list > button > div > small）
   - 检查所有 9px 以下文字，统一提升到≥10px（标签）/≥12px（正文）

2. 订单卡片右侧布局混乱：
   - 当前时间+金额+警告挤在 18px 宽列
   - 改为左右分栏：左 65%（订单号+客户+标签），右 35%（金额右对齐+时间+状态）
   - 修改 .prototype-orders .order-list > button 的 grid-template-columns

3. SKU退款按钮触控区不足：
   - 当前只有 15px 图标（.bom-list button），28px 宽高
   - 改为文字按钮"退款"，min-height 44px，图标+文字
   - disabled 时灰色，加 aria-label

4. 退款空态简陋：
   - 当前只有"暂无退款记录"一行文字
   - 改为三段式空态：RefundCcw 图标（48px）+"暂无退款"+"该订单未发生退款或退货"
   - 用 .empty-state 统一样式

5. 字符图标替换：
   - 订单卡片 ::before 用 "▣" 字符 → 改为 lucide PackageOpen 组件
   - 售后处理卡 ::before 用 "↺" 字符 → 改为 lucide RefreshCw 组件
   - 订单列表空态用 "＋" 符号 → 改为 lucide ShoppingCart 组件
   - 删除 CSS 中的 content: "▣"/"↺"/"＋"，用 React 组件替代

6. 订单详情hero金额无滚动动画：
   - 当前直接渲染金额
   - 改用 AnimatedChartValue 组件，数字从0滚动到目标值

7. 订单列表空态简陋：
   - 当前只有"本期尚无商品销售订单"+描述
   - 改为三段式空态：图标+"暂无订单"+描述+行动按钮（记录订单/先建商品成本卡）
   - 用 .empty-state 统一样式

## P1（12项）
8. 订单卡片入场动画：给 .order-list 加 stagger-in 类，卡片 stagger 入场（每张延迟50ms）
9. 订单卡片hover反馈：hover 时背景 --sdq-bg-canvas，阴影加深，右侧箭头右移2px
10. 订单详情各section入场stagger：给详情页各 section 加 stagger-in 类，依次入场（延迟80ms）
11. 订单表单SKU行布局混乱：
    - 当前下拉+数量+删除按钮挤在一行
    - 改为 grid 布局：SKU选择(1fr) + 数量(80px) + 删除(44px)，gap 8px
    - 修改 .bom-list > div 的 grid-template-columns

12. 批量操作工具栏过渡：选中订单时工具栏从顶部滑入，加 height+opacity 过渡（0.3s spring）
13. 搜索框展开过渡：点击搜索图标时搜索框从右侧展开，加 width+opacity 过渡（0.25s ease）
14. 筛选chips选中态：active 时背景 --sdq-bg-brand-soft，文字 --sdq-action-primary，加 2px 边框
15. 订单详情售后卡字号：KPI标签 10px → 11px，KPI数值 → 16px，行项目 → 12px
16. 订单详情hero状态标签颜色：已支付=profit绿，部分退款=cost橙，已退款=risk红，加徽章样式
17. 订单表单渠道模板预览卡：改为 3 列 grid，每列图标+数值+标签
18. 退款表单¥符号对齐：用 flex align-items: baseline，¥符号 16px，输入框 16px
19. 订单卡片选中态：selected 时左侧加 3px --sdq-action-primary 边框，背景 --sdq-bg-brand-soft

## P2（9项）
20. 订单卡片::after CSS箭头 → 改为 ChevronRight 组件，hover 时右移
21. 月份筛选原生 select → 改为 shadcn Select 组件（如果成本可控，否则保持原生但统一样式）
22. SKU行语义化：div 改为 article 或 li，加 role="listitem"
23. 退款原因扩充：增加"不喜欢/不想要""尺寸不合适""颜色不符"等常见原因
24. 利润预警卡图标按类型换：低于保本=TrendingDown，低于目标=Target
25. 表单底部padding：表单底部加 padding-bottom: 100px，避免被FAB遮挡
26. 售后处理卡点击反馈：加 :active scale(.98)，点击跳转到退款列表
27. 低利润标签统一：cost 橙色背景+白色文字，加 ⚠ 图标
28. 帕累托图标题精简："退款占比"→"退款原因"，合并重复标题

## 验证
1. pnpm check && pnpm test && pnpm build
2. 订单列表：检查卡片布局、字号、hover、入场动画、批量操作、搜索、筛选
3. 订单详情：检查hero金额动画、状态标签颜色、售后卡字号、SKU退款按钮、退款空态
4. 订单表单：检查SKU行布局、渠道预览卡、底部padding
5. 退款表单：检查¥符号对齐、退款原因选项
6. 5种皮肤下订单模块显示正常
7. prefers-reduced-motion 下动画禁用
```

#### 验收标准
- [ ] 无 9px 以下文字，订单号≥12px，标签≥10px
- [ ] 订单卡片左右分栏，金额不截断
- [ ] SKU退款按钮≥44px，含文字
- [ ] 退款空态三段式
- [ ] 字符图标（▣/↺/＋）全部替换为 lucide 组件
- [ ] hero金额用 AnimatedChartValue
- [ ] 订单卡片 stagger 入场+hover反馈
- [ ] 批量工具栏/搜索框过渡动画
- [ ] 状态标签颜色统一（绿/橙/红）
- [ ] 减少动效适配
- [ ] 三门禁全绿

---

### 批次 15：商品模块（32 项，P0×8 P1×14 P2×10）

#### 目标
修复商品列表/详情/表单/定价/SKU 32 项问题，重点：硬编码颜色、字号不达标、触控区不足、字符图标。

#### 涉及文件
- `client/src/pages/Home.tsx`（CardsPage/CardDetailPage/CardFormPage/PricingPage/SkusPage）
- `client/src/index.css`（样式）

#### Trae 指令（直接复制）

```
我需要修复商品模块的UI问题，请按以下步骤操作：

## P0（8项）
1. 成本趋势图硬编码颜色：
   - 商品详情近6月成本趋势图当前月 "#087FF5" → var(--sdq-chart-1)
   - 历史月 "#cfe2ff" → var(--sdq-blue-100)
   - 在 CSS 中定义 .cost-history i.current { background: var(--sdq-chart-1); }

2. 定价利润图SVG渐变硬编码：
   - PricingProfitTrendChart 中 linearGradient stopColor="#9dddff"
   - 改为给 <stop> 加 className，CSS 中定义 stop-color: var(--sdq-chart-2)

3. 商品列表KPI标签偏小：
   - 单位成本/售价/单件利润 label 9px → 11px
   - 数值 → 14px
   - positive=profit绿，negative=risk红
   - 修改 .product-kpis label em 和 .product-kpis label b

4. BOM行编辑/删除按钮触控区不足：
   - 当前 28px 宽高，只有图标
   - 改为 44px 高，图标+文字（编辑/删除），或合并为"更多"菜单
   - 修改 .bom-list button

5. SKU列表字号偏小：
   - label 9px → 11px，输入框 10px → 13px，按钮 9px → 11px
   - 输入框高度 40px
   - 修改 .sku-cost-form 相关样式

6. 字符图标替换：
   - 商品详情"添加成本项"用 "＋" 字符 → 改为 lucide Plus 图标+文字
   - 商品详情成本公式用 "＋""＝" 字符 → 改为 lucide Plus/Equal 图标，或CSS边框分隔
   - 删除 CSS content，用 React 组件替代

7. 商品列表空态简陋：
   - 当前只有"没有匹配的成本卡"
   - 改为三段式空态：PackageOpen 图标+"没有匹配的成本卡"+"更换关键词或清除筛选"+清除筛选按钮

8. 头像上传input键盘不可操作：
   - 当前 input[type=file] 样式隐藏，键盘用户无法操作
   - 改为可见按钮样式，加 focus-visible 轮廓
   - input opacity:0 但 position:absolute 覆盖按钮，保持可点击

## P1（14项）
9. 商品列表卡片入场动画：加 stagger-in 类，stagger 入场
10. 商品卡片hover反馈：hover 背景 --sdq-bg-canvas，阴影加深
11. 商品详情各section入场stagger：加 stagger-in 类
12. 定价页滑块自定义样式：
    - 当前用原生 range input
    - 自定义轨道+滑块+进度填充，滑块高度 44px
    - 加 :active 反馈，focus-visible 轮廓
13. 定价利润趋势图入场动画：折线 stroke-dashoffset + 面积淡入，stagger
14. 近6月成本趋势图入场动画：height 从0到目标值 spring，stagger
15. 商品表单材料行动画：新行从顶部滑入+淡入，删除行淡出+高度收缩
16. 商品详情"更多"菜单过渡：加 opacity+scale 过渡（0.2s ease），从触发点展开
17. 定价建议卡渐变无效：
    - 当前 linear-gradient 两色相同（都是 --sdq-action-primary）
    - 改为真实渐变：linear-gradient(135deg, --sdq-action-primary, --sdq-info)
18. 定价利润图数据点放大：普通点 r=1.8，峰值/最低 r=2.5，当前 r=3.5（当前 r=1.15-3.2）
19. 商品列表tabs切换动画：active 加下划线滑动动画（0.25s spring）
20. 定价页输入框label：10px → 11px，输入框 → 14px，small → 10px
21. 商品表单材料行布局：
    - 当前4输入框挤2列grid
    - 改为名称(1fr)+金额(100px)一行，规格(1fr)+数量(100px)一行
22. BOM表单加取消按钮：与保存按钮并排，form-secondary 样式

## P2（10项）
23. 商品毛利排行em标签：10px → 11px
24. 供应商排行em标签：10px → 11px
25. 成本诊断优先核对卡small：→ 10px，增加行高
26. 行业参考估算small：→ 10px
27. 健康度维度列表small：→ 10px，或默认隐藏点击展开
28. 利润瀑布图insight区标签：→ 11px，数值 → 14px
29. 分组标题h3样式统一：12px加粗+左侧品牌色竖条+上下间距12px
30. 期间切换segment-control样式统一：用全局 segment-control 组件样式
31. 销售目标进度卡：洞察页保留详细版，工作台保留迷你版
32. AnalysisControlHub入口：改为 grid 2列布局，每个入口图标+标题+描述

## 验证
1. pnpm check && pnpm test && pnpm build
2. 商品列表：检查卡片布局、KPI字号、hover、入场动画、tabs、空态
3. 商品详情：检查成本趋势图颜色、成本公式图标、BOM行按钮、更多菜单、入场动画
4. 商品表单：检查材料行布局、添加/删除动画、头像上传可访问性
5. 定价页：检查滑块样式、利润图颜色/动画/数据点、建议卡渐变、输入框字号
6. SKU列表：检查字号、输入框高度、按钮
7. 5种皮肤下商品模块显示正常
8. prefers-reduced-motion 下动画禁用
```

#### 验收标准
- [ ] 成本趋势图/定价利润图硬编码颜色替换为图表令牌
- [ ] 无 9px 以下文字，KPI标签≥11px
- [ ] BOM行按钮≥44px，含文字
- [ ] 字符图标（＋/＝）全部替换为 lucide 组件
- [ ] 商品列表空态三段式
- [ ] 头像上传input可键盘操作
- [ ] 商品列表 stagger 入场+hover反馈
- [ ] 定价滑块自定义样式，触控区≥44px
- [ ] 定价利润图+成本趋势图入场动画
- [ ] 定价建议卡真实渐变
- [ ] 数据点放大（r=1.8-3.5）
- [ ] BOM表单加取消按钮
- [ ] 减少动效适配
- [ ] 三门禁全绿

---

### 批次 16：洞察模块（35 项，P0×9 P1×14 P2×12）

#### 目标
修复洞察模块 35 项问题，重点：图表硬编码颜色、信息密度过高、FAB遮挡、层级过深、标题重复。

#### 涉及文件
- `client/src/pages/Home.tsx`（InsightsPage 及所有子组件）
- `client/src/index.css`（样式）

#### Trae 指令（直接复制）

```
我需要修复洞察模块的UI问题，请按以下步骤操作：

## P0（9项）
1. 成本趋势面积图band.color硬编码：
   - 搜索 band.color 或 area chart 的颜色定义
   - 替换为 var(--sdq-chart-1)，深色皮肤下自动变化

2. 成本结构饼图颜色硬编码：
   - 搜索饼图的 colors 数组（可能是 #087ff5/#9dddff/#cfe2ff 等）
   - 替换为引用 --sdq-chart-1 ~ --sdq-chart-6

3. FAB遮挡底部：
   - 洞察页底部加 padding-bottom: 96px（如果已有 ledger-page-shell 则确认生效）
   - 或在洞察页隐藏FAB（FAB仅在工作台/订单列表/商品列表显示）

4. 信息密度过高（13+卡片堆叠）：
   - 将次要卡片（行业参考估算/供应商排行/健康度雷达）改为可折叠展开
   - 默认只显示核心卡片（利润概览/瀑布图/利润趋势/商品毛利排行/成本诊断）
   - 折叠卡片显示标题+摘要，点击展开详情

5. 两层嵌套展开层级深：
   - 成本诊断的"优先核对"卡片嵌套层级过深
   - 改为平铺展示，或用Tab切换不同诊断维度

6. 健康度雷达SVG text太小：
   - 当前 text 可能 8-9px
   - 改为 11px，增加可读性
   - 或改为图例列表展示（雷达图+图例）

7. 身份卡标签10px偏小：
   - 洞察页顶部身份卡/店铺信息卡的标签
   - 改为 11px，数值 14px

8. 标题重复（经营利润出现2次）：
   - 搜索"经营利润"，找到重复的标题
   - 第一个保留"经营利润"，第二个改为"利润构成"或"利润明细"
   - 检查其他重复标题（如"成本结构"出现多次）

9. 标题p标签多余：
   - 搜索 <p> 标签包裹的标题
   - 改为 <h2>/<h3> 语义化标签，或移除多余p标签

## P1（14项）
10. 瀑布图入场动画：柱子从0到目标值 spring 动画，stagger 延迟（每根30ms）
11. 利润趋势图入场动画：折线 stroke-dashoffset + 面积淡入
12. 商品毛利排行条形图入场动画：width 从0到目标值 spring，stagger
13. 成本结构饼图入场动画：stroke-dashoffset 或 conic-gradient 旋转展开
14. 健康度雷达入场动画：多边形从中心展开 spring
15. 图表hover高亮：所有图表 hover 时数据点放大、显示 Tooltip
16. Tooltip全覆盖：瀑布图/利润趋势/毛利排行/成本结构/健康度雷达加 Tooltip
17. 图表网格线统一：用 --sdq-chart-grid，SVG line 实现
18. 数据点放大：普通点 r=2，当前点 r=3.5，hover r=4.5
19. 洞察页各section入场stagger：加 stagger-in 类，依次入场（延迟80ms）
20. 可折叠卡片过渡：展开/收起加 height+opacity 过渡（0.3s spring）
21. 标题简洁："本月经营利润概览"→"经营利润"，"商品毛利排行榜"→"毛利排行"
22. KPI卡片数字字号统一：主数字 22px，标签 11px，趋势 12px
23. 图例补全：所有图表加图例，位置统一（标题右侧或底部）

## P2（12项）
24. 瀑布图柱子圆角统一为 6px 6px 4px 4px
25. 图表卡片间距统一为 12px
26. 成本趋势X轴标签跨月时显示"8/15"格式
27. 图表空态前加 200ms shimmer 骨架屏
28. 利润概览卡趋势箭头颜色：上升=profit绿，下降=risk红
29. 成本诊断优先核对卡small：→ 10px，增加行高
30. 行业参考估算small：→ 10px
31. 健康度维度列表small：→ 10px，或默认隐藏点击展开
32. 利润瀑布图insight区标签：→ 11px，数值 → 14px
33. 分组标题h3样式统一：12px加粗+左侧品牌色竖条+上下间距12px
34. 期间切换segment-control样式统一：用全局 segment-control 组件样式
35. 销售目标进度卡：洞察页保留详细版，工作台保留迷你版

## 验证
1. pnpm check && pnpm test && pnpm build
2. 洞察页：检查所有图表颜色在5种皮肤下正常
3. 检查信息密度：核心卡片默认显示，次要卡片可折叠
4. 检查FAB不遮挡底部内容
5. 检查标题无重复/啰嗦
6. 检查所有图表入场动画+hover+Tooltip
7. 检查健康度雷达文字可读
8. 5种皮肤下洞察模块显示正常
9. prefers-reduced-motion 下动画禁用
```

#### 验收标准
- [ ] 成本趋势面积图/成本结构饼图硬编码颜色替换为图表令牌
- [ ] FAB不遮挡底部（或洞察页隐藏FAB）
- [ ] 信息密度优化：次要卡片可折叠
- [ ] 两层嵌套展开改为平铺或Tab
- [ ] 健康度雷达SVG text≥11px
- [ ] 身份卡标签≥11px
- [ ] 标题无重复（经营利润只出现1次）
- [ ] 标题p标签改为语义化标签
- [ ] 所有图表入场动画+hover高亮+Tooltip
- [ ] 数据点放大（r=2-4.5）
- [ ] 可折叠卡片过渡动画
- [ ] 标题简洁度优化
- [ ] KPI数字字号统一
- [ ] 减少动效适配
- [ ] 三门禁全绿

---

### 批次 17：我的模块（28 项，P0×8 P1×12 P2×8）

#### 目标
修复我的模块 28 项问题，重点：渐变无效、字号不达标、触控区不足、头像上传可访问性。

#### 涉及文件
- `client/src/pages/Home.tsx`（ProfilePage/SettingsPage/SkinCenterPage）
- `client/src/pages/SkinCenter.tsx`（皮肤中心）
- `client/src/components/skin-center/`（皮肤中心组件）
- `client/src/index.css`（样式）

#### Trae 指令（直接复制）

```
我需要修复我的模块的UI问题，请按以下步骤操作：

## P0（8项）
1. 个人身份卡渐变无效（三色相同）：
   - 当前 linear-gradient 三个色标可能都是 --sdq-action-primary
   - 改为真实渐变：linear-gradient(135deg, var(--sdq-action-primary), var(--sdq-info), var(--sdq-chart-6))
   - 或用品牌蓝→浅蓝的双色渐变

2. 头像预设label 9px偏小：
   - 头像选择区的预设头像label
   - 改为 11px，头像按钮 min-size 48px

3. 编辑按钮34px触控不足：
   - 个人资料/店铺资料的编辑按钮
   - 改为 min-height 44px，图标+文字"编辑"

4. 身份卡标签meta 10px偏小：
   - 身份卡上的店铺名/行业/邮箱等标签
   - 改为 11px，数值 14px

5. 店铺管理组编辑文字10px：
   - 店铺管理卡片的编辑/切换按钮文字
   - 改为 12px，按钮 min-height 40px

6. 账户组em 10px：
   - 账户设置组的描述文字
   - 改为 11px，增加行高

7. 头像上传input键盘不可操作：
   - 当前 input[type=file] 样式隐藏
   - 改为可见按钮样式，加 focus-visible 轮廓
   - input opacity:0 但 position:absolute 覆盖按钮

8. 皮肤中心卡片hover反馈：
   - 当前皮肤卡片可能没有hover效果
   - 加 hover 背景 --sdq-bg-canvas，阴影加深，边框 --sdq-action-primary
   - 加过渡 transition: all var(--sdq-duration-fast) var(--sdq-ease-standard)

## P1（12项）
9. 我的页面各section入场stagger：加 stagger-in 类，依次入场（延迟80ms）
10. 身份卡入场动画：加 fade-in-up 动画（0.4s spring）
11. 设置项hover反馈：hover 时背景 --sdq-bg-canvas，右侧箭头右移2px
12. 设置项点击反馈：加 :active scale(.98)
13. 皮肤中心卡片入场动画：加 stagger-in 类，stagger 入场
14. 皮肤切换过渡：切换皮肤时加 0.3s 颜色过渡，无布局跳动
15. 皮肤预览卡：每个皮肤卡片加迷你预览（展示主色/背景/文字色）
16. 退出登录按钮样式：当前可能是红色按钮，改为中性文字按钮（深灰+透明背景），hover 时浅红背景
17. 个人资料表单输入框高度统一：所有输入框 min-height 44px
18. 个人资料表单label字号：10px → 11px，输入框 → 14px
19. 店铺行业选择器：改为可搜索下拉或分段控制，触控区≥44px
20. 经营预算设置：滑块自定义样式，触控区≥44px，加当前值显示

## P2（8项）
21. 我的页面标题简洁："个人与店铺资料设置"→"资料设置"，"经营行业设置"→"经营行业"
22. 身份卡头像边框：加 2px --sdq-bg-surface 边框+阴影
23. 设置项图标统一：所有设置项左侧图标统一 18px，颜色 --sdq-text-tertiary
24. 设置项右侧箭头：统一用 ChevronRight 组件，hover 时右移
25. 分组标题h3样式统一：12px加粗+左侧品牌色竖条+上下间距12px
26. 皮肤中心自定义编辑器：颜色选择器加预览，触控区≥44px
27. 皮肤中心导入导出：按钮样式统一，加图标
28. 关于页面：版本号/更新日志/反馈入口，样式统一

## 验证
1. pnpm check && pnpm test && pnpm build
2. 我的页面：检查身份卡渐变、字号、编辑按钮、入场动画、hover反馈
3. 资料设置：检查输入框高度、label字号、行业选择器、预算滑块
4. 皮肤中心：检查卡片hover、入场动画、切换过渡、预览卡、自定义编辑器
5. 头像上传：检查键盘可操作性、focus样式
6. 退出登录按钮：检查样式（中性文字按钮）
7. 5种皮肤下我的模块显示正常
8. prefers-reduced-motion 下动画禁用
```

#### 验收标准
- [ ] 个人身份卡真实渐变（三色不同）
- [ ] 无 9px 以下文字，标签≥11px
- [ ] 编辑按钮≥44px，含文字
- [ ] 头像上传input可键盘操作
- [ ] 皮肤中心卡片hover反馈
- [ ] 我的页面 stagger 入场
- [ ] 设置项hover+点击反馈
- [ ] 皮肤切换过渡流畅
- [ ] 皮肤预览卡展示主色/背景/文字
- [ ] 退出登录按钮改为中性文字按钮
- [ ] 输入框高度统一≥44px
- [ ] 行业选择器/预算滑块触控区≥44px
- [ ] 标题简洁度优化
- [ ] 减少动效适配
- [ ] 三门禁全绿

---

### 批次 18：最终验证与回归（全模块）

#### 目标
全部批次完成后，进行全模块回归验证，确保三门禁全绿、5种皮肤正常、减少动效适配、无硬编码颜色残留。

#### Trae 指令（直接复制）

```
全部UI打磨批次已完成，现在进行最终验证：

## 第一步：三门禁全绿
pnpm check && pnpm test && pnpm build
三个命令必须全部通过，有任何错误立即修复。

## 第二步：硬编码颜色扫描
搜索代码中所有硬编码的 hex/rgb/hsl 颜色：
grep -rn "#[0-9a-fA-F]\{3,8\}" client/src/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules | grep -v primitives.css
grep -rn "rgb(" client/src/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules | grep -v color-mix
- primitives.css 中的原色阶定义允许保留
- 其他文件中的硬编码颜色必须替换为 --sdq-* 令牌
- 列出所有残留的硬编码颜色，逐一修复

## 第三步：5种皮肤回归测试
启动开发服务器，逐一切换5种皮肤（soft/deep/aurora/midnight/forest），检查以下页面：
1. 登录/注册页
2. 工作台（所有图表）
3. 订单列表/详情/表单
4. 商品列表/详情/表单/定价
5. 洞察页（所有图表）
6. 我的页面/资料设置/皮肤中心
7. 全局组件（tabbar/FAB/Toast/弹窗/空态）
每个皮肤下检查：文字对比度≥4.5:1、非文字≥3:1、图表颜色正常、业务语义色一致、无不可读文字、无布局错乱

## 第四步：减少动效适配
在浏览器开发者工具中开启 prefers-reduced-motion: reduce，检查所有页面：
- 所有入场动画禁用
- 所有过渡动画禁用或缩短
- 所有自动轮播禁用
- 页面仍可正常使用
- 无内容因动画禁用而不可见

## 第五步：触控区检查
检查所有可点击元素：按钮≥44px、图标按钮≥44px、输入框≥44px、列表项≥44px、复选框≥20px
列出所有触控区不足的元素，逐一修复

## 第六步：标题简洁度检查
搜索所有页面标题：无啰嗦标题、无重复标题、标题语义化（h1/h2/h3）、字号层级清晰

## 第七步：无障碍检查
所有图片有alt、图标按钮有aria-label、表单输入框有label、错误状态有aria-invalid、焦点顺序合理、focus-visible轮廓可见

## 第八步：性能检查
首屏加载<3s、无不必要重渲染、图表不阻塞主线程、CSS动画用transform/opacity

## 第九步：更新文档
1. 更新 docs/ui-polish-todo-2026-09-01.md：所有模块"执行状态"改为"已执行"
2. 更新 docs/change-log.md：登记所有UI打磨变更

## 第十步：提交
git add -A
git commit -m "feat(ui): 全局UI/UX逐页打磨完成（8模块225项问题）"
git push
```

#### 验收标准
- [ ] 三门禁全绿
- [ ] 无硬编码颜色残留（primitives.css 除外）
- [ ] 5种皮肤下所有页面正常
- [ ] 减少动效下所有页面可用
- [ ] 所有可点击元素触控区≥44px
- [ ] 标题简洁度优化
- [ ] 无障碍检查通过
- [ ] 性能检查通过
- [ ] 文档已更新
- [ ] 代码已提交推送

---

## 完成标准（全部批次完成后）

### UI 问题修复（批次 1-5）
1. **17 项线上 UI 问题全部修复**（5 项已完成 + 12 项待实施）
2. **三门禁全绿**：每批 `pnpm check && pnpm test && pnpm build` 通过
3. **回归测试覆盖**：新增 ≥20 项 DOM/功能回归测试
4. **生产发布**：合并 main 后按 Runbook 发布到 app.3dq.site
5. **线上验收**：发布后用测试账号逐页复核

### 皮肤中心（批次 6-10）
6. **令牌统一**：所有组件只消费 `--sdq-*` 语义令牌，无硬编码颜色
7. **皮肤完整**：5 种官方皮肤（soft/deep/aurora/midnight/forest）全部可用
8. **皮肤中心页面**：皮肤列表/实时预览/自定义编辑器/导入导出全部可用
9. **自定义皮肤**：用户可基于官方皮肤创建自定义皮肤，localStorage 持久化
10. **对比度达标**：所有皮肤通过 WCAG AA 对比度检查（正文 ≥4.5:1，非文本 ≥3:1）
11. **业务色保护**：利润/成本/风险/信息色在所有皮肤下保持一致可辨识
12. **切换流畅**：皮肤切换有过渡动画，无布局跳动，持久化正常

### UI 逐页打磨（批次 11-18）
13. **令牌完整**：新增图表令牌（--sdq-chart-1~8）、补全语义色色阶、新增材质/动效/字体/阴影/层级令牌
14. **无硬编码颜色**：所有组件只消费 --sdq-* 语义令牌，无 hex/rgb 硬编码（primitives.css 除外）
15. **组件统一**：CSS 重复定义收敛为单一权威定义，按钮/卡片/表单/空态/Toast/弹窗状态规范统一
16. **8模块225项问题全部修复**：登录/注册(24)、工作台(20)、订单(28)、商品(32)、洞察(35)、我的(28)、全局组件(30)、全局配色(28)
17. **图表规范**：所有图表用 --sdq-chart-* 令牌，5种皮肤下自动变化，入场动画+hover高亮+Tooltip全覆盖
18. **触控达标**：所有可点击元素 min-height≥44px，图标按钮≥44px，输入框≥44px
19. **字号达标**：无 9px 以下文字，标签≥10px，正文≥12px，KPI标签≥11px
20. **标题简洁**：无啰嗦/重复标题，语义化标签（h1/h2/h3），字号层级清晰
21. **动效规范**：所有页面入场动画（stagger）、按钮hover/active、卡片hover、过渡动画，prefers-reduced-motion 全适配
22. **5种皮肤回归**：soft/deep/aurora/midnight/forest 下所有页面正常，对比度达标，业务语义色保护
23. **无障碍达标**：alt/aria-label/focus-visible/aria-invalid 完整，颜色不是唯一信息传达方式
24. **性能达标**：首屏<3s，CSS动画用transform/opacity，图表不阻塞主线程
25. **三门禁全绿**：每批 pnpm check && pnpm test && pnpm build 通过
26. **文档更新**：ui-polish-todo/change-log/design-tokens 文档同步更新

## References
- 线上问题清单：docs/live-ui-beauty-audit-2026-08-31.md
- 解决方案：docs/live-ui-solutions-2026-08-31.md
- 全局方案：docs/ui-ux-optimization-solution-2026-08-31.md
- 全面检查：docs/global-ui-layout-element-chart-title-audit-2026-08-31.md
- 皮肤中心设计：docs/skin-center-design-2026-08-31.md
- 逐页打磨方案：docs/ui-polish-todo-2026-09-01.md（8模块225项问题）
- 设计系统基线：design-system/DESIGN.md
