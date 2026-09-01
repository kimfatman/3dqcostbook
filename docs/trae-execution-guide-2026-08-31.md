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

### 批次 19：图表专项优化（数据表达 + 美观度 + 交互性）

#### 目标
基于 `docs/chart-data-expression-audit-2026-09-01.md` 审查报告，对 18 个图表进行专项优化：4 个图表类型变更、全局图表规范统一、所有图表加入场动画和 hover Tooltip。

#### 涉及文件
- `client/src/pages/Home.tsx`（所有图表组件）
- `client/src/index.css`（图表样式）
- `client/src/components/ChartTooltip.tsx`（Tooltip 组件，如已存在则复用）

#### 前置依赖
- 批次 11（全局配色与令牌）必须已完成，--sdq-chart-1~8 令牌已存在
- 批次 12（全局组件）必须已完成，动画关键帧和 stagger-in 工具类已存在

#### Trae 指令（直接复制）

```
我需要对所有图表进行专项优化，请按以下步骤操作：

## 第一部分：4 个图表类型变更（P0）

### 1. 成本分析饼图（CostAnalysisPieChart）改为横向条形图
当前问题：与成本结构环形图（CostStructureRing）功能完全重复，饼图不适合>5分类
修改方案：
- 将 CostAnalysisPieChart 组件重命名为 CostStructureBarChart
- 渲染方式从 conic-gradient 饼图改为横向条形图（与 SkuTopBars 样式一致）
- 每行：排名序号 + 分类名 + 金额 + 占比 + 条形进度条 + ChevronRight
- 按金额降序排列，前5名显示，超过5名显示"其他N类"汇总行
- 条形颜色：第1名 --sdq-chart-1，第2名 --sdq-chart-2，第3名 --sdq-chart-3，其余 --sdq-chart-8
- 标题从"钱花在哪里"改为"成本结构"
- 保留点击下钻功能（onSelect/onOpenAll）
- 保留底部洞察（最大驱动/占比）

### 2. 月度成本堆叠面积图（MonthlyCostStackChart）改为堆叠柱状图
当前问题：面积图不适合离散月份+多分类（最多8层，底层几乎不可见）
修改方案：
- 将渲染方式从 SVG path 堆叠面积改为堆叠柱状图
- 每月一根柱子，柱子内部分类堆叠（从下到上按金额排序）
- 柱子宽度：月份数≤6时每柱宽 12%，间距 4%
- 柱子加圆角（顶部 4px）
- 分类颜色：用 --sdq-chart-1~8，前5类显示，超过5类合并为"其他"
- 保留顶部图例（前4类+"+N类"）
- 保留底部对比条（最新月/较上月/最大分类）
- 加Y轴刻度（0/25%/50%/75%/100%，左侧显示）
- 保留点击下钻功能（onOpen）

### 3. 退款帕累托图（RefundPareto）加累计占比折线
当前问题：只有条形，缺累计占比折线，无法完整实现80/20分析
修改方案：
- 在条形图上方叠加累计占比折线（SVG polyline）
- 折线Y轴：右侧，0%-100%
- 折线数据点：每个原因的累计占比（cumulativeShare）
- 折线颜色：--sdq-chart-4（橙色），数据点 r=2.5
- 加80%参考线（dashed line，--sdq-chart-8，标注"80%"）
- 前两原因用 --sdq-chart-1（主色蓝）高亮，其余用 --sdq-chart-8
- 保留顶部集中度卡片（前两原因占比）
- 保留点击下钻功能（onSelect）

### 4. 月度现金流图（MonthlyCashFlowChart）加净额折线
当前问题：只有双柱，缺净额趋势，无法直观看到现金流变化趋势
修改方案：
- 在双柱上方叠加净额折线（SVG polyline）
- 净额 = 流入 - 流出
- 折线颜色：净额>0 用 --sdq-chart-3（绿），净额<0 用 --sdq-chart-5（红）
- 数据点 r=2.5，当前月 r=3.5
- 加零基准线（dashed line，--sdq-chart-grid）
- 双柱改为真实柱子（圆角，高度动画）
- 流入柱颜色：--sdq-chart-3（绿），流出柱颜色：--sdq-chart-5（红）
- 保留筛选面板（渠道/供应商）
- 保留底部对比（流入/流出/净额）
- 保留点击下钻功能（onOpen）

## 第二部分：全局图表规范统一（P1）

### 5. 网格线统一
- 所有有坐标系的图表（折线/柱状/面积/雷达）统一用 SVG line 实现网格线
- 网格线颜色：var(--sdq-chart-grid)
- 横向网格线：3-4条（25%/50%/75%/100%）
- 纵向网格线：按需（时间序列图可不显示纵向网格线）
- 删除销售动能图的 repeating-linear-gradient 网格线，改用 SVG line

### 6. 数据点大小统一
- 普通数据点：r=2
- 当前月/当前值数据点：r=3.5
- 峰值/最低值数据点：r=2.5
- hover 数据点：r=4.5
- 用 CSS 类统一控制：.chart-point / .chart-point.current / .chart-point.peak / .chart-point:hover
- 修改利润趋势图（r=1.65-2.8）、销售动能图（r=1.65-2.8）、定价利润图（r=1.15-3.2）

### 7. X 轴标签格式统一
- 月度图："8月"格式
- 日度图："15日"格式
- 跨月时："8/15"格式
- 标签字号：10px，颜色 var(--sdq-text-tertiary)
- 标签与数据点垂直对齐
- 当前月/最新日标签高亮（颜色 var(--sdq-text-primary)，加粗）

### 8. 图例位置/样式统一
- 图例位置：标题右侧（横向排列）或图表底部（横向排列）
- 图例项：颜色点（10px 圆点）+ 标签（10px，var(--sdq-text-secondary)）
- 超过5项时：显示前4项 + "其他N项"
- 图例可点击：点击高亮对应数据系列，再次点击取消
- 统一样式类：.chart-legend / .chart-legend-item / .chart-legend-dot

### 9. 摘要卡片样式统一
- 所有图表底部摘要卡片统一为 3 栏等宽 grid
- 每栏：标签（10px，var(--sdq-text-tertiary)）+ 数值（14px，bold，var(--sdq-text-primary)）
- 数值颜色按语义：正值 var(--sdq-profit)，负值 var(--sdq-risk)，中性 var(--sdq-text-primary)
- 统一样式类：.chart-summary / .chart-summary-item / .chart-summary-label / .chart-summary-value
- 修改利润趋势（最新/最高/最低）、销售动能（最新/峰值/客单）、成本堆叠（最新月/较上月/最大分类）、现金流（流入/流出/净额）

### 10. 空态/加载态规范
- 空态统一三段式：图标（48px，var(--sdq-text-tertiary)）+ 标题（14px bold）+ 描述（12px，var(--sdq-text-secondary)）+ 行动按钮（44px，fixed-primary）
- 加载态：shimmer 骨架屏（200ms 延迟后显示，动画 1.5s infinite）
- 空态与加载态视觉区分：空态有行动按钮，加载态无按钮只有骨架
- 统一样式类：.chart-empty / .chart-loading / .chart-skeleton
- 修改 HomeChartEmpty 组件，统一为三段式

## 第三部分：所有图表加入场动画（P1）

### 11. 柱状图入场动画
- 适用：销售动能图、商品成本趋势图、退款帕累托图、现金流图、结构对比图、堆叠柱状图
- 动画：height 从 0 到目标值，spring 动画（cubic-bezier(0.34, 1.56, 0.64, 1)）
- 时长：0.6s
- stagger：每根柱子延迟 30ms
- 实现：CSS @keyframes chart-bar-in { from { height: 0; } } + .chart-bar { animation: chart-bar-in 0.6s var(--sdq-ease-spring) both; }
- 注意：SVG 柱子用 transform: scaleY(0) 到 scaleY(1)，transform-origin: bottom

### 12. 折线图入场动画
- 适用：利润趋势图、销售动能图折线、定价利润图、退款帕累托累计折线、现金流净额折线
- 动画：stroke-dashoffset 从 100% 到 0，时长 0.8s，ease-out
- 面积图：opacity 从 0 到 1，延迟 0.3s，时长 0.6s
- 实现：CSS .chart-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: chart-line-in 0.8s ease-out forwards; }
- @keyframes chart-line-in { to { stroke-dashoffset: 0; } }

### 13. 环形图入场动画
- 适用：销售目标进度环、预算环形图、成本结构环形图
- SVG 环形（circle stroke-dashoffset）：从满到目标值，1s spring
- conic-gradient 环形：旋转展开（从 0 到目标角度），1s spring
- 中心数字：AnimatedChartValue 从 0 滚动到目标值，与环形动画同步
- 实现：CSS .chart-ring-progress { stroke-dasharray: 314; stroke-dashoffset: 314; animation: chart-ring-in 1s var(--sdq-ease-spring) forwards; }

### 14. 面积图入场动画
- 适用：堆叠柱状图（原面积图已改为柱状图，如保留其他面积图）
- 动画：opacity 从 0 到 1 + clip-path 从下往上展开
- 时长：0.8s，stagger 每层 100ms
- 实现：CSS .chart-area { opacity: 0; animation: chart-area-in 0.8s ease-out forwards; }

### 15. 雷达图入场动画
- 适用：经营健康度雷达图
- 动画：多边形 scale 从 0 到 1，从中心展开，1s spring
- 网格线：opacity 从 0 到 1，stagger 每层 100ms
- 实现：CSS .health-shape { transform: scale(0); transform-origin: center; animation: chart-radar-in 1s var(--sdq-ease-spring) forwards; }

### 16. 条形图入场动画
- 适用：SKU排行、供应商排行、成本结构条形图（原饼图改）、结构对比图
- 动画：width 从 0 到目标值，spring 动画，stagger 每行 50ms
- 实现：CSS .chart-bar-h { width: 0; animation: chart-bar-h-in 0.6s var(--sdq-ease-spring) forwards; }

### 17. 瀑布图入场动画
- 适用：利润瀑布图
- 动画：每根柱子从 0 到目标高度，spring 动画，stagger 100ms
- 连接线：柱子动画完成后淡入（延迟 0.5s）
- 实现：复用柱状图动画类

### 18. 减少动效适配
- 所有图表动画加 @media (prefers-reduced-motion: reduce) 禁用
- 禁用时图表直接显示最终状态，无动画

## 第四部分：所有图表加 hover Tooltip（P1）

### 19. 统一 ChartTooltip 组件
- 检查 client/src/components/ChartTooltip.tsx 是否已存在
- 如不存在，创建统一的 Tooltip 组件：
  - Props: label, value, detail, position（top/bottom/left/right）
  - 样式：背景 var(--sdq-bg-elevated)，圆角 8px，阴影 var(--sdq-shadow-elevated)，padding 8px 12px
  - 文字：label 10px tertiary，value 14px bold，detail 10px secondary
  - 动画：opacity 0→1 + translateY(4px)→0，0.15s ease-out
  - 触控设备：点击显示，再次点击或点击其他区域隐藏

### 20. 各图表 Tooltip 内容
- 利润瀑布图：点击/hover 柱子显示（步骤名/金额/占营收比例）
- 利润趋势图：hover 数据点显示（月份/收入/成本/利润/利润率）
- 预算环形图：hover 环形显示（已用XX% / 已用XX元 / 预算XX元 / 剩余XX元）
- 退款帕累托图：hover 条形显示（原因/金额/件数/占比/累计占比）
- 销售动能图：hover 柱子/数据点显示（日期/销售额/订单数/客单价/环比）
- SKU排行：hover 行显示（商品名/数值/占比/排名）
- 成本结构环形图：hover 扇区显示（分类名/金额/占比/较上月变化）
- 成本结构条形图（原饼图改）：hover 行显示（分类名/金额/占比/排名）
- 结构对比图：hover 双条形显示（分类/本期占比/上期占比/变化值）
- 销售目标进度环：hover 环形显示（完成率XX% / 已完成XX元 / 目标XX元 / 预计月末XX元）
- 堆叠柱状图（原面积图改）：hover 柱子显示（月份/每层分类/金额/占比/总成本）
- 现金流图：hover 柱子/数据点显示（月份/流入/流出/净额/累计）
- 健康度雷达图：hover 维度轴/数据点显示（维度名/分数/原始值/公式）
- 定价利润图：hover 数据点显示（售价/贡献利润/利润率/与保本价差额）
- 商品成本趋势图：hover 柱子显示（月份/单位成本/较上月变化/与平均差额）
- 供应商排行：hover 行显示（供应商名/金额/笔数/占比/排名）

### 21. hover 高亮效果
- 柱状图：hover 柱子亮度 +8%（filter: brightness(1.08)），阴影加深
- 折线图：hover 数据点 r 从 2 放大到 4.5，折线亮度 +8%
- 环形图：hover 扇区亮度 +8%，轻微放大（scale 1.02）
- 条形图：hover 行背景 var(--sdq-bg-canvas)，条形亮度 +8%
- 雷达图：hover 维度轴高亮，对应数据点放大
- 所有 hover 过渡：0.15s ease-out

## 第五部分：标题简洁化（P2）

### 22. 图表标题统一
- "钱花在哪里" → "成本结构"
- "本期利润形成" → "利润构成"
- "近 6 月经营利润"（副标题）→ "近6月"（主标题"利润趋势"已含）
- "成本归属·供应商" → "供应商成本"
- "近 6 月单位成本趋势" → "成本趋势"
- "销售动能"（已简洁，保留）
- 所有主标题≤6字，副标题放时间范围
- 删除冗余修饰词（"本期""近6月"等在主标题中重复出现的）

## 第六步：验证
1. pnpm check && pnpm test && pnpm build，三门禁全绿
2. 启动开发服务器，逐页检查 18 个图表：
   - 4 个类型变更的图表渲染正确
   - 所有图表入场动画流畅（stagger/spring）
   - 所有图表 hover 高亮 + Tooltip 显示正确
   - 网格线/数据点/图例/摘要卡片样式统一
   - 空态三段式 + 加载态骨架屏
3. 切换 5 种皮肤，图表颜色自动变化（--sdq-chart-1~8）
4. 开启 prefers-reduced-motion，所有动画禁用，图表直接显示
5. 触控设备上点击图表显示 Tooltip
6. 检查所有图表标题简洁，无啰嗦/重复

## 注意事项
- 批次 11（令牌）和批次 12（全局组件）必须已完成，否则 --sdq-chart-* 令牌和动画类不存在
- 图表类型变更时保留原有的 props 接口和点击下钻功能，不破坏外部调用
- SVG 动画用 CSS 类控制，不要在 JS 中操作 style
- Tooltip 组件要支持触控设备（点击显示，而非仅 hover）
- 所有动画加 prefers-reduced-motion 适配
- 堆叠柱状图的分类颜色与原面积图保持一致（--sdq-chart-1~8）
```

#### 验收标准
- [ ] 成本分析饼图改为横向条形图（与环形图形成互补）
- [ ] 月度成本堆叠面积图改为堆叠柱状图
- [ ] 退款帕累托图加累计占比折线 + 80%参考线
- [ ] 月度现金流图加净额折线 + 零基准线
- [ ] 所有图表网格线统一用 SVG line + --sdq-chart-grid
- [ ] 数据点大小统一（普通r=2/当前r=3.5/峰值r=2.5/hover r=4.5）
- [ ] X轴标签格式统一（月/日/跨月）
- [ ] 图例位置/样式统一，可点击高亮
- [ ] 摘要卡片 3 栏等宽 grid，数值颜色按语义
- [ ] 空态三段式 + 加载态 shimmer 骨架屏
- [ ] 柱状图入场动画（height spring + stagger）
- [ ] 折线图入场动画（stroke-dashoffset + 面积淡入）
- [ ] 环形图入场动画（stroke-dashoffset/conic-gradient 旋转）
- [ ] 雷达图入场动画（scale 从中心展开）
- [ ] 条形图入场动画（width spring + stagger）
- [ ] 所有动画加 prefers-reduced-motion 适配
- [ ] 统一 ChartTooltip 组件，支持 hover + 触控点击
- [ ] 18 个图表全部加 hover Tooltip（内容完整）
- [ ] hover 高亮效果（亮度+8%/放大/阴影）
- [ ] 图表标题简洁化（≤6字，无啰嗦/重复）
- [ ] 5 种皮肤下图表颜色自动变化
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

---

### 批次 20：层级收纳专项优化（信息架构 + 折叠规范 + 分组标题）

#### 目标
基于 `docs/hierarchy-organization-audit-2026-09-01.md` 审查报告，优化全部界面的层级收纳：取消洞察页两层嵌套折叠、统一折叠默认状态规范、所有页面新增分组标题、重新排序洞察页卡片、导航返回逻辑改用 pageStack 自动管理。

#### 涉及文件
- `client/src/pages/Home.tsx`（所有页面结构/折叠/分组/返回逻辑）
- `client/src/index.css`（分组标题/折叠动画样式）
- `client/src/lib/navigation-state.ts`（导航状态管理，如需要）

#### 前置依赖
- 批次 12（全局组件）必须已完成，动画和组件规范已统一
- 批次 16（洞察模块）必须已完成，洞察页基础优化已落地

#### Trae 指令（直接复制）

```
我需要对全部界面的层级收纳进行专项优化，请按以下步骤操作：

## 第一部分：P0 - 洞察页两层嵌套折叠取消（重大重构）

### 1. 取消"成本与结构复核"外层折叠
当前问题：analysisReviewOpen 折叠区域默认收起，里面包含 7+ 重要卡片（成本诊断/成本分析饼图/行业参考估算/经营控制/销售目标/成本结构变化/供应商排行），用户可发现性极差。
修改方案：
- 删除 analysisReviewOpen 状态和对应的折叠触发按钮（analysis-more-trigger）
- 将折叠区域内的 7 个卡片直接平铺显示，不再包裹在折叠 div 中
- 保留卡片原有的 props 和点击下钻功能，不破坏外部调用

### 2. "行业参考估算"保留折叠但移出嵌套
当前问题：analysisDetailsOpen 折叠区域嵌套在"成本与结构复核"折叠内，形成两层嵌套。
修改方案：
- 保留 analysisDetailsOpen 折叠状态和触发按钮
- 将其从"成本与结构复核"折叠区域移出，作为独立卡片放在"成本与结构"分组末尾
- 折叠触发按钮加内容预览："包含3项潜在漏损估算"（根据 visibleHiddenCosts.length 动态显示）
- 确保不再存在嵌套折叠（折叠区域内不再包含折叠区域）

### 3. 洞察页卡片重新排序（按业务逻辑）
当前顺序：利润概览→瀑布图→利润趋势→毛利排行→（折叠7卡片）→成本趋势→现金流→健康度
修改为 5 个分组，按业务逻辑排序：
- 分组1"经营利润"：经营利润概览 + 利润构成瀑布图（保持不变）
- 分组2"趋势与排行"：利润趋势图 + 商品毛利排行（保持不变）
- 分组3"成本与结构"：成本诊断 + 成本结构（原饼图）+ 成本结构变化 + 供应商排行 + 行业参考估算（保留折叠）
- 分组4"目标与控制"：销售目标 + 经营控制 + 经营报表（AnalysisControlHub）
- 分组5"现金流与健康"：成本趋势 + 现金流收支 + 经营健康度
注意：经营控制（AnalysisControlHub）从原"成本与结构复核"折叠内移出，放在"目标与控制"分组

### 4. 洞察页新增分组标题
当前只有"经营利润"和"趋势与商品毛利"2个分组标题。
修改方案：
- 新增3个分组标题："成本与结构"、"目标与控制"、"现金流与健康"
- 分组标题样式：复用现有 analysis-group-title 类（12px 加粗 + 左侧 3px 品牌色竖条 + 上方 16px 下方 8px）
- 分组标题放在对应分组的第一个卡片之前

## 第二部分：P0 - 折叠默认状态统一规范

### 5. 制定并执行折叠默认状态规范
规范：
- 默认展开：核心业务数据（利润概览/销售目标/成本诊断/健康度维度列表）
- 默认收起：次要/辅助信息（行业参考估算/评分公式/更多信息/查看全部）
- 长列表（>5项）：默认显示前5项，其余折叠"查看全部"
- 筛选/搜索：默认收起
- 批量操作：隐藏（触发时显示）

需要修改的折叠默认状态：
- 健康度维度列表（health-dimension-list）：当前默认展开全部5维，改为默认展开前3维，其余折叠"查看全部5维"（新增 showAllHealthDimensions 状态）
- 结构对比图（showAll）：保持默认收起（>3类时），已符合规范
- 记录表单"更多信息"（recordMoreOpen）：保持默认收起，已符合规范
- "行业参考估算"（analysisDetailsOpen）：保持默认收起，已符合规范

### 6. 所有折叠区域加内容预览
规范：折叠区域触发按钮必须包含内容预览（如"包含3项估算"/"共8类"/"2项待核对"）。
需要修改的折叠区域：
- "行业参考估算"：加"包含N项潜在漏损估算"（visibleHiddenCosts.length）
- 结构对比"查看全部"：加"共N类"（items.length）
- 记录表单"更多信息"：加"供应商/备注/凭证"
- 健康度"查看全部5维"：加"共5维"
- 健康度评分公式（details）：保持现有 summary 文字，已符合规范

### 7. 禁止嵌套折叠检查
全局检查所有折叠区域，确保不存在嵌套折叠（折叠区域内不再包含折叠区域）。
- 已取消"成本与结构复核"外层折叠，嵌套问题已解决
- 检查其他页面是否存在嵌套折叠，如有则取消外层或内层折叠

## 第三部分：P0 - 所有页面新增分组标题

### 8. 工作台新增分组标题
当前工作台 8+ 卡片直接堆叠，无分组标题。
新增 4 个分组标题：
- "经营概览"：经营概览卡 + 销售动能图
- "成本与目标"：成本结构环形图 + 销售目标进度环
- "商品排行"：SKU销量排行
- "待办与活动"：经营待办 + 促销轮播
分组标题样式：复用 analysis-group-title 类，或新增 .page-group-title 类（样式相同）

### 9. 订单页新增分组标题
当前订单列表+售后处理+退款帕累托直接堆叠。
新增 2 个分组标题：
- "订单列表"：月份筛选 + 搜索框 + 状态筛选 + 订单列表
- "售后与退款"：售后处理卡 + 退款帕累托图（如存在）
注意：分组标题放在筛选区域之前，筛选区域属于"订单列表"分组

### 10. 我的页新增分组标题
当前身份卡+店铺管理+设置+账户直接堆叠。
新增 3 个分组标题：
- "账号与店铺"：身份卡 + 店铺管理
- "设置"：资料设置 + 皮肤中心 + 经营行业 + 经营预算
- "账户"：退出登录
注意：分组标题样式与其他页面统一

### 11. 商品页分组标题（可选）
商品列表页结构简单，可接受无分组标题。但建议在空态时加"商品列表"分组标题，保持一致性。

## 第四部分：P1 - 导航返回逻辑改用 pageStack 自动管理

### 12. handleBack 改用 pageStack 自动返回
当前问题：handleBack 函数中有 10+ if-else 硬编码返回逻辑（subPage==="refundForm"→setSubPage("orderDetail") 等），不灵活。
修改方案：
- 默认使用 pageStack 自动返回：读取 pageStack 最后一项，setTab(prev.tab) + setSubPage(prev.subPage) + setPageStack(stack => stack.slice(0,-1))
- 保留特殊情况的硬编码（如需要跳过中间页面），但作为例外处理
- 新增页面时不需要修改 handleBack，自动支持返回
- 确保 pageStack 在 goSub/navigateToSubPage 时正确记录当前状态
- 测试所有子页面的返回功能，确保返回路径正确

注意：此修改可能影响现有返回逻辑，需要充分测试。如果 pageStack 记录不完整，可能导致返回错误。建议先在测试环境验证，再提交。

## 第五部分：P1 - 其他界面层级优化

### 13. 订单页筛选区域压缩
当前问题：月份筛选 + 搜索框 + 状态筛选 chips 占 3 行，筛选区域过高。
修改方案：
- 月份筛选与状态筛选 chips 放在同一行（左右分栏：左侧月份，右侧状态 chips）
- 搜索框保持折叠（点击搜索图标展开）
- 筛选区域高度从 3 行压缩到 1-2 行
- 确保在窄屏下（<360px）仍可正常显示，必要时换行

### 14. 记录表单凭证移出折叠
当前问题：凭证上传被折叠在"更多信息"（recordMoreOpen）里，凭证是重要功能，不应该折叠。
修改方案：
- 将凭证上传字段（record-voucher-field）从"更多信息"折叠区域移出
- 放在分类字段之后、"更多信息"折叠之前
- 默认展开，用户可直接看到凭证上传入口
- "更多信息"折叠只保留：供应商（可选）+ 备注
- 确保凭证上传功能正常（上传/预览/移除/错误提示）

### 15. 健康度维度列表改可折叠
当前问题：健康度维度列表（health-dimension-list）默认展开全部 5 维，内容过多，与雷达图+概览重复。
修改方案：
- 新增 showAllHealthDimensions 状态（默认 false）
- 默认显示前 3 维（销售进度/利润质量/成本控制），其余 2 维（现金覆盖/售后质量）折叠
- 折叠触发按钮："查看全部 5 维"（ChevronDown 图标），点击展开全部
- 展开后按钮变为"收起"（ChevronUp 图标）
- 维度列表加内容预览："共 5 维，已证据化 N 维"
- 确保展开/收起有 height + opacity 过渡动画（0.3s spring）

### 16. 子页面新增分组标题
当前订单详情/退款表单无分组标题，多个 section 直接堆叠。
修改方案：
- 订单详情（orderDetail）：新增 2 个分组标题
  - "经营口径"：hero 卡 + 售后经营口径卡 + 利润预警卡
  - "商品与售后"：SKU 成交明细 + 退款与退货回收
- 退款表单（refundForm）：新增 2 个分组标题
  - "退款信息"：退款数量 + 退款金额 + 手续费 + 退款原因
  - "退货回收"：回收状态 + 退款日期
- 分组标题样式与其他页面统一（.page-group-title 类）

## 第六部分：P2 - 精致度优化

### 17. 工作台促销轮播改紧凑卡片
当前问题：促销轮播（promo-carousel）视觉权重过高，与经营数据卡片混在一起。
修改方案：
- 促销轮播高度减半（从当前高度改为 80px）
- 改为紧凑横向滚动卡片（左右滑动，或自动轮播 5s）
- 放在"待办与活动"分组末尾
- 确保不影响经营数据卡片的视觉优先级

### 18. 我的页设置组加入口图标
当前问题：设置组 4 个入口（资料设置/皮肤中心/经营行业/经营预算）只有文字+箭头，无图标。
修改方案：
- 每个入口加左侧图标（18px，颜色 --sdq-text-tertiary）：
  - 资料设置：UserCog
  - 皮肤中心：Palette
  - 经营行业：Store
  - 经营预算：Wallet
- 图标与文字垂直居中，间距 12px
- 确保图标在 5 种皮肤下颜色正常

### 19. 商品详情更多操作合并到编辑页
当前问题：商品详情"更多"按钮（cardMoreOpen）只有"删除成本卡"一个操作，单独的更多菜单过于冗余。
修改方案：
- 删除商品详情的"更多"按钮和 cardMoreOpen 状态
- 将"删除成本卡"操作移到编辑页（cardForm）底部，作为危险操作按钮（红色文字+透明背景）
- 商品详情底部只保留 2 个按钮："编辑成本" + "测算定价"
- 确保删除功能正常（确认弹窗+删除逻辑）

### 20. 折叠区域触发按钮样式统一
当前问题：折叠触发按钮样式不统一（analysis-more-trigger / details / more-trigger / show-all 等）。
修改方案：
- 所有折叠触发按钮统一样式：整行可点击，左侧标题+描述+内容预览，右侧 ChevronDown/ChevronUp 图标
- 统一样式类：.collapsible-trigger
- 展开时图标旋转 180deg（或切换为 ChevronUp），加 0.3s 过渡
- hover 时背景 var(--sdq-bg-canvas)，加 0.15s 过渡
- 确保所有折叠区域（行业估算/更多信息/查看全部/健康维度）都使用统一样式

## 第七步：验证
1. pnpm check && pnpm test && pnpm build，三门禁全绿
2. 洞察页：检查 5 个分组标题正确，无嵌套折叠，卡片顺序正确（利润→趋势→成本→目标→现金流→健康度）
3. 洞察页：检查"行业参考估算"折叠独立存在，有内容预览，不再嵌套在其他折叠内
4. 工作台：检查 4 个分组标题正确，促销轮播紧凑
5. 订单页：检查 2 个分组标题正确，筛选区域压缩到 1-2 行
6. 我的页：检查 3 个分组标题正确，设置组有图标
7. 记录表单：检查凭证上传默认展开，不在"更多信息"折叠内
8. 健康度：检查维度列表默认显示前 3 维，"查看全部 5 维"可展开/收起
9. 订单详情/退款表单：检查分组标题正确
10. 所有折叠区域：检查有内容预览，触发按钮样式统一，无嵌套折叠
11. 导航返回：测试所有子页面返回功能，确保 pageStack 自动返回正确
12. 切换 5 种皮肤，分组标题/折叠按钮/图标颜色正常
13. 开启 prefers-reduced-motion，折叠展开动画禁用

## 注意事项
- 洞察页重构是重大修改，确保不破坏现有 props 接口和点击下钻功能
- 导航返回逻辑修改可能影响现有返回路径，需要充分测试所有子页面
- 折叠默认状态修改后，确保核心数据默认展开，次要数据默认收起
- 分组标题样式与现有 analysis-group-title 统一，不要新增不一致的样式
- 所有修改加 aria-expanded/aria-controls 无障碍属性
- 折叠展开动画用 height + opacity，不要用 display:none/block（避免动画失效）
```

#### 验收标准
- [ ] 洞察页"成本与结构复核"外层折叠已取消，7+卡片平铺
- [ ] "行业参考估算"折叠独立存在，有内容预览，无嵌套折叠
- [ ] 洞察页 5 个分组标题正确（经营利润/趋势与排行/成本与结构/目标与控制/现金流与健康）
- [ ] 洞察页卡片顺序按业务逻辑排序
- [ ] 经营控制（AnalysisControlHub）移到"目标与控制"分组
- [ ] 折叠默认状态规范执行（核心数据展开/次要数据收起）
- [ ] 健康度维度列表默认显示前 3 维，可展开全部
- [ ] 所有折叠区域有内容预览
- [ ] 全局无嵌套折叠
- [ ] 工作台 4 个分组标题（经营概览/成本与目标/商品排行/待办与活动）
- [ ] 订单页 2 个分组标题（订单列表/售后与退款）
- [ ] 我的页 3 个分组标题（账号与店铺/设置/账户）
- [ ] 订单详情/退款表单分组标题正确
- [ ] 订单页筛选区域压缩到 1-2 行
- [ ] 记录表单凭证上传默认展开，不在折叠内
- [ ] 工作台促销轮播改紧凑卡片
- [ ] 我的页设置组有入口图标
- [ ] 商品详情"更多"按钮删除，删除操作移到编辑页
- [ ] 折叠触发按钮样式统一（.collapsible-trigger）
- [ ] 导航返回逻辑改用 pageStack 自动管理（特殊情况保留硬编码）
- [ ] 所有子页面返回功能测试通过
- [ ] 5 种皮肤下分组标题/折叠/图标颜色正常
- [ ] prefers-reduced-motion 下折叠动画禁用
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

---

### 批次 21：可阅读性专项优化（字号 + 行高 + 字距 + 对比度 + 数字排版）

#### 目标
基于 `docs/readability-audit-2026-09-01.md` 审查报告，优化全部界面的可阅读性：消除 8px/9px 极端小字号、建立 8 级 Type Scale 规范、统一行高和字距、修复小字号对比度问题、统一数字字体和金额字号、规范标题标签。

#### 涉及文件
- `client/src/tokens/primitives.css`（新增 Type Scale 字号/行高/字距令牌）
- `client/src/tokens/semantic.css`（文字颜色使用规范）
- `client/src/index.css`（全局字号/行高/字距替换，106处小字号提升）
- `client/src/pages/Home.tsx`（标题标签规范化 h1/h2/h3，文字截断加 title）
- 其他页面组件（数字字体统一，金额字号三档）

#### 前置依赖
- 批次 11（全局配色与令牌）必须已完成，颜色令牌已统一
- 批次 12（全局组件）必须已完成，组件样式已统一

#### Trae 指令（直接复制）

```
我需要对全部界面的可阅读性进行专项优化，请按以下步骤操作：

## 第一部分：P0 - 建立 8 级 Type Scale 规范（基础层，必须先做）

### 1. 在 primitives.css 新增 Type Scale 令牌
在 client/src/tokens/primitives.css 的 :root 中新增以下令牌：

/* === 字号阶梯 Type Scale === */
--sdq-type-display: 32px;    /* 登录页大标题/hero金额 */
--sdq-type-h1: 28px;         /* 页面主标题 */
--sdq-type-h2: 20px;         /* 卡片标题/分组标题 */
--sdq-type-h3: 16px;         /* 子标题/重要正文 */
--sdq-type-body: 14px;       /* 正文/列表标题/按钮 */
--sdq-type-caption: 12px;    /* 辅助文字/表单标签/副标题 */
--sdq-type-micro: 11px;      /* 标签/KICKER/时间戳 */
--sdq-type-chart: 10px;      /* 图表图例/坐标轴（仅限图表） */

/* === 行高规范 === */
--sdq-leading-display: 1.15;
--sdq-leading-h1: 1.2;
--sdq-leading-h2: 1.3;
--sdq-leading-h3: 1.4;
--sdq-leading-body: 1.5;
--sdq-leading-caption: 1.5;
--sdq-leading-micro: 1.45;
--sdq-leading-chart: 1.4;

/* === 字距规范 === */
--sdq-tracking-display: -0.02em;
--sdq-tracking-h1: -0.02em;
--sdq-tracking-h2: -0.01em;
--sdq-tracking-h3: 0;
--sdq-tracking-body: 0;
--sdq-tracking-caption: 0;
--sdq-tracking-micro: 0.02em;
--sdq-tracking-chart: 0;

注意：这些令牌是基础层，后续所有字号/行高/字距修改都引用这些令牌，不再硬编码 px 值。

### 2. 全局默认行高
在 client/src/index.css 的 :root 或 body 中新增：
body { line-height: var(--sdq-leading-body); }

确保 80%+ 没有行高的文字继承全局 1.5 行高。

## 第二部分：P0 - 消除 8px 极端小字号（5处）

### 3. 8px 全部提升到 10px
搜索 client/src/index.css 中所有 font-size: 8px，替换为 var(--sdq-type-chart) 或 10px：

需要修改的 5 处：
1. .ring i small（环形图中心单位文字）：8px → 10px
2. .trend-chart em（趋势图X轴月份标签）：8px → 10px
3. .cost-card-list strong small（商品卡片单位小字）：8px → 10px
4. .report-list strong small（报表卡片单位小字）：8px → 10px
5. .supplier-list strong small（供应商卡片单位小字）：8px → 10px

修改方式：将 font-size: 8px 替换为 font-size: var(--sdq-type-chart)（图表相关）或 font-size: 10px（非图表）。

验证：全局搜索 font-size: 8px，确保为 0 处。

## 第三部分：P0 - 9px 严重小字号按场景提升（24处）

### 4. 底部导航 9px → 10px（高频使用，必须可读）
.tabbar button { font-size: 9px → var(--sdq-type-chart) 或 10px; }
.tabbar button.active { font-size: 9px → 10px; font-weight: 700; }
同时修改未选中状态颜色：text-tertiary → text-secondary（提升对比度）。

### 5. KPI标签/列表副标题 9px → 11px（需要阅读的内容）
搜索以下选择器，将 font-size: 9px 替换为 var(--sdq-type-micro) 或 11px：
- .cost-kpi-grid span（成本KPI标签）
- .dashboard-kicker > span（仪表盘KICKER）
- .equation-result > span（公式结果标签）
- .analysis-judgment > span（分析判断标签）
- .cost-card-list em（商品列表副标题）
- .report-list em（报表列表副标题）
- .supplier-rank em（供应商列表副标题）
- .top-card-list em（顶部卡片副标题）
- .brand-mini em（品牌迷你副标题）
- .industry-insight-card span（行业洞察标签）
- .result-summary（结果摘要）
- .summary-risk span（风险摘要）

### 6. 图表图例/Tooltip辅助 9px → 10px（辅助信息，可接受较小）
搜索以下选择器，将 font-size: 9px 替换为 var(--sdq-type-chart) 或 10px：
- .chart-legend（图表图例）
- .stack-legend（堆叠面积图例）
- .cashflow-legend（现金流图例）
- .chart-tooltip em（图表Tooltip辅助文字）
- .chart-tooltip small（图表Tooltip小字）
- .pricing-profit-trend figcaption（定价利润图标题）
- .pricing-profit-tooltip（定价利润Tooltip）

### 7. 头像预设/行业标签/其他 9px → 10px
搜索以下选择器，将 font-size: 9px 替换为 10px：
- .avatar-preset-grid label（头像预设标签）
- .industry-picker small（行业选择标签）
- .weekly-bars em（周柱状图标签）
- .pricing-inputs small（定价输入提示）
- .pricing-note p（定价注意事项）
- .analysis-compare-list em（窄屏对比列表副标题，@media max-width:375px）
- .pricing-plans .report-breakdown em（定价计划副标题）
- .pricing-empty-tip em（定价空态提示）

验证：全局搜索 font-size: 9px，确保为 0 处。

## 第四部分：P0 - 小字号对比度修复

### 8. 小字号禁用 text-tertiary 颜色
规范：10px/11px 小字号必须用 text-primary 或 text-secondary，禁止用 text-tertiary。

搜索 client/src/index.css 中同时满足以下条件的选择器：
- font-size: 10px 或 11px
- color: var(--sdq-text-tertiary)

将 color: var(--sdq-text-tertiary) 替换为 color: var(--sdq-text-secondary)。

典型场景：
- 列表副标题（10-11px + text-tertiary）→ text-secondary
- KPI标签（10-11px + text-tertiary）→ text-secondary
- 底部导航未选中（10px + text-tertiary）→ text-secondary
- 头像预设标签（10px + text-tertiary）→ text-secondary

注意：text-tertiary 仅限 12px+ 装饰性文字（如时间戳、占位符）。

### 9. 图表文字对比度修复
.chart-tooltip / .chart-legend 中的 chart-muted 颜色，如果在 10px 下对比度不足 4.5:1，需要调深。
检查 client/src/tokens/semantic.css 中的 --chart-muted 定义，确保在浅色和深色皮肤下 10px 文字对比度 ≥ 4.5:1。
如果不足，将 --chart-muted 调深一个色阶（如 neutral-500 → neutral-600）。

## 第五部分：P1 - 文字截断加 title 属性

### 10. 所有截断文字加 title 属性
搜索 client/src/pages/ 和 client/src/components/ 中使用 white-space: nowrap + text-overflow: ellipsis 的元素，为对应的 JSX 元素添加 title 属性。

典型场景：
- 商品名称（cost-card-list b）：加 title={商品名称}
- 供应商名称（supplier-list b）：加 title={供应商名称}
- 报表名称（report-list b）：加 title={报表名称}
- 店铺名称（profile-identity-top h1）：加 title={店铺名称}
- 列表副标题（em 标签）：加 title={完整描述}
- 品牌名称（brand-mini strong）：加 title={品牌名称}

注意：
- title 属性值必须是完整的未截断内容
- 对于动态数据，title={item.name} 或类似
- 对于静态文字，title="完整文字"
- 不要为不会截断的短文字加 title（避免冗余）

### 11. 重要内容允许2行，不使用单行截断
对于商品名称、供应商名称等重要内容，如果经常被截断，改为允许2行：
- 将 white-space: nowrap 改为 display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
- 同时保留 title 属性作为兜底

优先修改：商品列表名称、供应商列表名称、报表列表名称。

## 第六部分：P1 - 数字字体统一

### 12. 所有金额/百分比/数量数字用等宽字体
规范：所有金额、百分比、数量数字必须用 --financial-numeric-font + font-variant-numeric: tabular-nums。

搜索 client/src/index.css 中包含金额/百分比/数量的选择器，检查是否已使用等宽字体：
- 列表中的金额（.cost-card-list strong / .report-list strong / .supplier-rank strong）：如果未用，添加 font-family: var(--financial-numeric-font); font-variant-numeric: tabular-nums;
- KPI中的百分比：如果未用，添加等宽字体
- 订单金额：如果未用，添加等宽字体

注意：
- 图表数字继续用 --chart-numeric（已统一）
- 日期/时间可用默认字体，但数字部分加 tabular-nums
- 不要为非数字文字（如中文标签）设置等宽字体

### 13. 金额字号三档规范
建立金额数字三档规范，替换混乱的字号：
- 大金额（hero卡/详情页主金额）：28-32px → 使用 var(--sdq-type-display) 或 28px
- 中金额（列表项金额/KPI金额）：16-18px → 使用 16px
- 小金额（辅助金额/对比金额）：13-14px → 使用 var(--sdq-type-body) 或 14px

搜索 client/src/index.css 中金额相关选择器，将字号统一到三档：
- .detail-hero strong（29px）→ 28px（大金额）
- .pricing-base strong（29px）→ 28px（大金额）
- .pricing-quote strong（25px）→ 28px（大金额）
- .pricing-recommend strong（33px）→ 32px（大金额）
- .amount-input input（27px）→ 28px（大金额，输入框）
- .amount-input span（22px）→ 20px（中金额，货币符号）
- 列表金额（12px）→ 14px（小金额，提升可读性）

注意：修改金额字号时，确保行高和字距也对应调整（大金额用 leading-display/tracking-display）。

## 第七部分：P1 - 标题标签规范化

### 14. 页面主标题用 h1，统一 28px
搜索 client/src/pages/ 中页面主标题，确保：
- 使用 <h1> 标签（不是 div/span/strong）
- 字号统一为 var(--sdq-type-h1) 或 28px
- 行高 var(--sdq-leading-h1) 或 1.2
- 字距 var(--sdq-tracking-h1) 或 -0.02em

当前页面标题字号有 20px/25px/28px/30px/31px 多种，统一为 28px。

### 15. 卡片标题用 h2，统一 20px
搜索 client/src/pages/ 和 client/src/components/ 中卡片标题，确保：
- 使用 <h2> 标签（不是 strong/b/div）
- 字号统一为 var(--sdq-type-h2) 或 20px
- 行高 var(--sdq-leading-h2) 或 1.3

当前卡片标题字号有 14px/15px/16px/17px/18px 多种，统一为 20px。
注意：如果卡片空间有限，可用 18px 作为例外，但必须加注释说明。

### 16. 子标题/分区标题用 h3，统一 16px
搜索 client/src/pages/ 中子标题/分区标题，确保：
- 使用 <h3> 标签（不是 p/span）
- 字号统一为 var(--sdq-type-h3) 或 16px

### 17. 禁止用 strong/b 代替标题标签
搜索 client/src/pages/ 中用 strong/b 作为标题的场景，替换为 h2/h3：
- 卡片标题用 strong → 改为 h2
- 分区标题用 b → 改为 h3
- 列表项标题用 b → 保留 b（列表项不是标题层级）

注意：strong/b 用于强调正文内容，不用于标题。标题必须用 h1-h6。

## 第八部分：P1 - 字距使用统一

### 18. 按字号设置字距
规范：
- ≥20px 标题：负字距 -0.01em ~ -0.02em
- 14-16px 正文：字距 0
- 10-12px 标签/辅助：正字距 0.01em ~ 0.02em
- 图表数字：字距 0 或 -0.05em（紧凑数字）

搜索 client/src/index.css 中 letter-spacing，确保符合规范：
- 大标题（≥20px）：letter-spacing 应该是负值（-.01em ~ -.08em），如果是 0 或正值，调整为 -0.02em
- 正文（14-16px）：letter-spacing 应该是 0，如果有值，移除
- 标签（10-12px）：letter-spacing 应该是正值（.02em ~ .1em），如果是 0，添加 0.02em

注意：当前大标题字距有 -.075em/-.08em（过紧），统一调整为 -0.02em（除了 Display 级可用 -0.02em）。

## 第九部分：P2 - 精致度优化

### 19. 数字对齐统一
规范：
- 列表/表格中的数字：右对齐（text-align: right）
- KPI卡片中的数字：左对齐（与标签对齐）
- 图表中的数字：根据图表类型（柱状图顶部居中，折线图数据点上方）

搜索 client/src/index.css 中数字相关选择器，检查对齐方式：
- 列表金额（.cost-card-list strong / .report-list strong）：确保 text-align: right
- KPI金额：确保 text-align: left 或与标签对齐
- 如果有不统一的，按规范调整

### 20. 长文本行高统一 1.6-1.7
搜索 client/src/index.css 中描述文字（p 标签，≥3行的长文本），确保行高 ≥ 1.6：
- .industry-insight-card p（10px，line-height 1.6）✅ 已符合
- .detail-breakdown p（11px，line-height 1.7）✅ 已符合
- .screen-title p / .sub-intro p（12px，line-height 1.7）✅ 已符合
- .pricing-recommend p（10px，line-height 1.55）→ 调整为 1.6
- .profile-tip p（10px，line-height 1.6）✅ 已符合
- 其他长文本 p 标签：如果行高 < 1.6，调整为 1.6

### 21. 中英文混排间距（可选，如时间允许）
在中文和英文/数字之间添加 0.25em 间距。
可以用 CSS 实现：.cjk-mixed { word-spacing: 0.25em; } 或用 JS 自动添加。
如果实现复杂，可跳过，作为后续优化项。

### 22. 中文标点规范（可选，如时间允许）
统一使用全角标点（，。！？；：""''（）），避免半角标点。
搜索代码中硬编码的中文文案，检查标点是否统一。
如果有半角标点，替换为全角标点。

## 第十步：验证
1. pnpm check && pnpm test && pnpm build，三门禁全绿
2. 全局搜索 font-size: 8px，确保为 0 处
3. 全局搜索 font-size: 9px，确保为 0 处
4. 全局搜索 font-size: 10px，确认仅用于图表辅助文字（chart-legend/tooltip/X轴标签）
5. 检查 Type Scale 令牌已定义（8级字号/8级行高/8级字距）
6. 检查全局默认行高 1.5 已设置
7. 检查小字号（10-11px）不再使用 text-tertiary 颜色
8. 检查底部导航字号 10px，未选中颜色 text-secondary
9. 检查截断文字已加 title 属性（抽样验证 10 处）
10. 检查金额/百分比数字已用等宽字体 + tabular-nums
11. 检查金额字号三档（大28-32/中16-18/小13-14）
12. 检查页面标题用 h1 28px，卡片标题用 h2 20px
13. 检查字距按字号规范（大标题负/正文0/标签正）
14. 切换 5 种皮肤，文字颜色/对比度正常
15. 开启 prefers-reduced-motion，无异常
16. 用浏览器实际查看 5 个核心页面（登录/工作台/订单/商品/洞察），文字清晰可读

## 注意事项
- Type Scale 令牌是基础层，必须先定义再替换
- 8px/9px 替换时，注意不要把图表的特殊紧凑数字改得过大（图表可用10px）
- 标题标签替换（strong→h2）时，确保样式不丢失（h2 默认样式可能与 strong 不同）
- 金额字号调整时，注意 hero 卡/详情页的大金额布局可能需要微调
- 字距调整时，大标题 -.075em 过紧，统一为 -0.02em，但 Display 级（32px）可保持 -0.02em
- 所有修改优先引用 Type Scale 令牌，不硬编码 px 值
- 修改后确保 5 种皮肤下文字颜色正常
```

#### 验收标准
- [ ] 全局无 font-size: 8px（0处）
- [ ] 全局无 font-size: 9px（0处）
- [ ] Type Scale 令牌已定义（8级字号/8级行高/8级字距）
- [ ] 全局默认 line-height 1.5 已设置
- [ ] 底部导航字号 10px，未选中颜色 text-secondary
- [ ] KPI标签/列表副标题 11px
- [ ] 图表图例/Tooltip 10px
- [ ] 小字号（10-11px）不再使用 text-tertiary 颜色
- [ ] 图表文字对比度 ≥ 4.5:1（5种皮肤）
- [ ] 截断文字已加 title 属性（抽样10处验证）
- [ ] 重要内容（商品/供应商/报表名称）允许2行
- [ ] 金额/百分比/数量数字已用等宽字体 + tabular-nums
- [ ] 金额字号三档（大28-32/中16-18/小13-14）
- [ ] 页面主标题用 h1 28px
- [ ] 卡片标题用 h2 20px
- [ ] 子标题用 h3 16px
- [ ] 无 strong/b 代替标题标签
- [ ] 字距按字号规范（大标题负/正文0/标签正）
- [ ] 列表数字右对齐，KPI数字左对齐
- [ ] 长文本行高 ≥ 1.6
- [ ] 5 种皮肤下文字颜色/对比度正常
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

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

### 图表专项优化（批次 19）
27. **图表类型正确**：成本分析饼图→横向条形图、成本堆叠面积图→堆叠柱状图、退款帕累托加累计折线、现金流加净额折线
28. **图表规范统一**：网格线/数据点/X轴标签/图例/摘要卡片/空态加载态全部统一
29. **图表动效完整**：18个图表全部加入场动画（柱状/折线/环形/雷达/条形/瀑布），spring物理+stagger
30. **图表交互完整**：18个图表全部加hover高亮+Tooltip，支持触控点击
31. **图表标题简洁**：主标题≤6字，无啰嗦/重复
32. **图表皮肤兼容**：5种皮肤下图表颜色自动变化（--sdq-chart-1~8）
33. **图表减少动效**：prefers-reduced-motion下所有动画禁用

### 层级收纳专项优化（批次 20）
34. **无嵌套折叠**：所有折叠区域无嵌套，洞察页"成本与结构复核"外层折叠已取消
35. **折叠规范统一**：核心数据默认展开，次要数据默认收起，所有折叠区域有内容预览
36. **分组标题完整**：工作台/订单/洞察/我的/子页面全部有分组标题（共15+个）
37. **洞察页重构**：5个分组（经营利润/趋势与排行/成本与结构/目标与控制/现金流与健康），卡片按业务逻辑排序
38. **导航返回灵活**：handleBack 改用 pageStack 自动管理，新增页面无需修改返回逻辑
39. **筛选区域压缩**：订单页筛选从3行压缩到1-2行
40. **凭证默认展开**：记录表单凭证上传移出折叠，默认展开
41. **健康度可折叠**：维度列表默认前3维，可展开全部5维
42. **折叠触发统一**：所有折叠触发按钮样式统一（.collapsible-trigger）

### 可阅读性专项优化（批次 21）
43. **无极端小字号**：全局无 8px/9px，最小字号 10px（仅限图表）
44. **Type Scale 统一**：8级字号阶梯（32/28/20/16/14/12/11/10px），所有文字引用令牌
45. **行高统一**：全局默认 1.5，按字号调整（小字号≥1.4，长文本≥1.6）
46. **字距统一**：大标题负字距(-0.02em)/正文0/标签正字距(0.02em)
47. **小字号对比度**：10-11px 禁用 text-tertiary，必须用 text-secondary 以上
48. **底部导航可读**：tabbar 10px，未选中 text-secondary，选中 action-primary
49. **文字截断可访问**：所有截断文字加 title 属性，重要内容允许2行
50. **数字字体统一**：金额/百分比/数量用等宽字体 + tabular-nums
51. **金额三档**：大28-32px/中16-18px/小13-14px
52. **标题标签规范**：页面h1 28px/卡片h2 20px/子标题h3 16px，无 strong 代替标题

## References
- 线上问题清单：docs/live-ui-beauty-audit-2026-08-31.md
- 解决方案：docs/live-ui-solutions-2026-08-31.md
- 全局方案：docs/ui-ux-optimization-solution-2026-08-31.md
- 全面检查：docs/global-ui-layout-element-chart-title-audit-2026-08-31.md
- 皮肤中心设计：docs/skin-center-design-2026-08-31.md
- 逐页打磨方案：docs/ui-polish-todo-2026-09-01.md（8模块225项问题）
- 设计系统基线：design-system/DESIGN.md
