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

## References
- 线上问题清单：docs/live-ui-beauty-audit-2026-08-31.md
- 解决方案：docs/live-ui-solutions-2026-08-31.md
- 全局方案：docs/ui-ux-optimization-solution-2026-08-31.md
- 全面检查：docs/global-ui-layout-element-chart-title-audit-2026-08-31.md
- 皮肤中心设计：docs/skin-center-design-2026-08-31.md
- 设计系统基线：design-system/DESIGN.md
