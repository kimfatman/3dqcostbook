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

1. **17 项线上 UI 问题全部修复**（5 项已完成 + 12 项待实施）
2. **三门禁全绿**：每批 `pnpm check && pnpm test && pnpm build` 通过
3. **回归测试覆盖**：新增 ≥20 项 DOM/功能回归测试
4. **生产发布**：合并 main 后按 Runbook 发布到 app.3dq.site
5. **线上验收**：发布后用测试账号逐页复核

## References
- 线上问题清单：docs/live-ui-beauty-audit-2026-08-31.md
- 解决方案：docs/live-ui-solutions-2026-08-31.md
- 全局方案：docs/ui-ux-optimization-solution-2026-08-31.md
- 全面检查：docs/global-ui-layout-element-chart-title-audit-2026-08-31.md
- 设计系统基线：design-system/DESIGN.md
