# P0 苹果原则适配包：实施顺序、风险控制与验收门禁

## 实施顺序

P0 必须按“纯展示模型 → 首页组件 → 样式令牌 → 动效与触控 → 测试与视觉验收”的顺序实施。这样可以将展示层级变化与账本计算分开，避免为了改首页视觉而碰触收入、成本、退款和预算的真实口径。

| 阶段 | 修改文件 | 具体操作 | 禁止改动 | 完成标准 |
|---:|---|---|---|---|
| 1 | `client/src/lib/home-decision.ts` | 新建纯函数，接收 `totals`、`budgetBurn` 和简化通知 DTO，输出主卡上下文、三项指标和唯一优先风险。 | 不导入 React，不读 LocalStorage，不重新计算预算或订单利润。 | 单测覆盖各风险优先级。 |
| 2 | `client/src/hooks/useReducedMotion.ts` | 新建响应式 `matchMedia` Hook。 | 不在 render 阶段读取或写入状态。 | 系统偏好变化可停止两个首页计时器。 |
| 3 | `client/src/pages/Home.tsx` | 导入两个新模块；用 `homeDecision` 替换 `OperatingSnapshot` 的分散 props；将主卡风险行指向现有 `goSub()`。 | 不改变 `notificationItems` 的消息中心完整列表；不改变 `promotionBanners` 内容和目标。 | 首页、消息中心、预算、订单、成本卡下钻路径都可到达。 |
| 4 | `client/src/index.css` | 在文件末尾新增单独的 `/* P0 Apple-principles adaptation */` 区块，先以白名单覆盖字号、命中区和 `home-decision-*`。 | 不全局替换 9px/10px；不删除既有样式块；不改底部 Tab 信息架构。 | 375/390/430px 不溢出，文字和焦点清晰。 |
| 5 | `client/src/lib/home-decision.test.ts` | 新增风险优先级、预算标签与亏损表现测试。 | 不用 UI 快照替代数据模型测试。 | 新旧 24 项业务测试仍通过，新增测试通过。 |
| 6 | 文档与检查点 | 更新 `ideas.md`、`todo.md`、验收记录；通过质量门禁后创建检查点。 | 未通过检查或视觉复核不得保存发布版本。 | 有可回滚版本与审阅证据。 |

## 关键类型与映射建议

`Home.tsx` 当前把 `NotificationTarget` 定义在页面内，并且 `goSub()` 接收更宽的 `SubPage`。为了避免新 lib 文件反向依赖页面，实施时应让展示层使用独立且小的目标联合类型：

```ts
// client/src/lib/home-decision.ts
export type HomeDecisionTarget = "budget" | "orders" | "cards" | "records";
```

页面层仅需定义一个完整映射，消除类型断言：

```ts
const homeDecisionPage: Record<HomeDecisionTarget, SubPage> = {
  budget: "budget",
  orders: "orders",
  cards: "cards",
  records: "records",
};

function openHomeDecision(target: HomeDecisionTarget) {
  if (target === "orders") {
    setOrderStatusFilter("low_profit");
    setTab("orders");
    setSubPage(null);
    return;
  }
  goSub(homeDecisionPage[target]);
}
```

这里需要特别处理订单路径。现有 `goSub("orders")` 会进入首页 Tab 内的二级订单账本，而 `setTab("orders")` 打开的是一级订单页面。P0 风险行要导向“低利润订单”时，应打开一级订单 Tab 并写入 `orderStatusFilter = "low_profit"`；预算、成本卡和流水仍可沿用二级页面栈。这个差异是当前代码中最容易被忽略的导航边界。

## 风险控制

### 1. 业务口径风险

主卡不可使用新算式。利润、成本、预算与风险都必须来自现有 `totals`、`buildBudgetBurn()`、`orderWarnings` 与 `notificationItems`。`home-decision.ts` 只是决定**哪条已知结果更优先展示**，不具有新的财务计算职责。任何需要新增“风险分数”或预测参数的需求应另开算法任务，不应混入 P0。

### 2. CSS 级联风险

`index.css` 历经多轮 UI 收口，首页存在后置覆盖规则。P0 样式须一次性放在文件结尾，并以 `.prototype-home .home-decision`、`.prototype-home .home-decision-risk` 等高特异性选择器限定作用域。不要为旧 `.operating-snapshot` 在文件不同位置继续追加不透明的覆盖；在 P0 发布后，可另立任务整理重复规则。

### 3. 可访问性风险

关键小文字提升到 11–12px 不代表自动符合可读性要求。必须在冷白背景、蓝色主卡、Navy Banner 三类真实背景上检验文字对比，并确保风险同时使用图标、文字和色彩。[1] Banner 自动切换仍须尊重 `prefers-reduced-motion`；不能用 `aria-live` 反复播报 ticker 内容。[1]

### 4. 版面风险

主卡增加风险行动行后高度会从当前约 164px 提升至 236–252px。为了保持首屏节奏，Banner 要由约 118px 压缩至 96px，趋势卡保持次级露出。若 375px 视口出现三列金额重叠，优先让金额缩小至 15px 并将标签稳定为 11px，禁止截断金额或把三列拆成三张卡。

## 回归与验收

| 类别 | 验收动作 | 通过条件 |
|---|---|---|
| TypeScript | `pnpm run check` | 不新增隐式 `any`、不使用不安全的目标类型断言。 |
| 账本逻辑 | `pnpm test` | 原 24 项测试全部通过；新增首页决策测试均通过。 |
| 构建 | `pnpm run build` | Vite 与服务端 bundle 成功。现有包体积提示可记录，但不是本轮阻断项。 |
| 手机布局 | 375×812、390×844、430×932 截图。 | 主卡、Banner、趋势标题和两个数据行不发生横向溢出或文字截断。 |
| 大字号 | 浏览器 125% 和 150% 缩放检查。 | 行业/期间、主金额、三列核算与风险行动不重叠；必要时风险文案两行截断。 |
| 键盘 | Tab 键依次进入 ticker、风险行、Banner、趋势、预算、第一成本和底部导航。 | 焦点环清晰，焦点顺序符合阅读顺序。 |
| 减少动态 | 打开浏览器系统减少动态模拟。 | Banner 和 ticker 不自动切换；点位与暂停仍可操作。 |
| 下钻 | 点击预算风险、低利润订单、风险成本卡、第一成本。 | 分别打开正确页面和预置筛选，不丢失 Tab 或二级页返回路径。 |

## 发布与回滚边界

发布前需创建新的检查点。若视觉回归显示主卡高度压缩趋势和预算、或下钻路径无法正确进入一级订单筛选，应回滚到当前已发布版本 `689e8d88`，而不是通过硬重置修改工作区。P0 发布后再收集真实用户对“主卡是否更快看懂”的反馈，才决定是否进入 P1 容器减法与导航材料层优化。

## 参考

[1] [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)  
[2] [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
