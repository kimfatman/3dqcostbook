# 算得清 P0 苹果原则适配包：技术实施规格

**状态：** 方案阶段，尚未修改生产界面。  
**目标：** 在不改动账本算法、五行业模板、Banner 商业位与底部五 Tab 的前提下，完成文字与数值层级、首页经营判断主线、触控/无障碍三个 P0 改造。

## 1. 改造范围与不变项

本轮只调整前端呈现与可访问性，不改动 `cost-book.ts`、`ledger-metrics.ts`、订单成本快照、预算计算或消息派生的业务口径。首页仍以真实的 `totals`、`budgetBurn`、`notificationItems` 和 `trend` 为唯一数据来源；宣传 Banner 仍只服务产品宣传与后续广告，经营提醒仍仅来自真实账本状态。

| 保持不变 | P0 需要改变 |
|---|---|
| Digital Blue `#087FF5`、Navy `#0B1836`、冷白背景、账本蓝图与 IBM Plex Mono 金额字体。 | 关键辅助文本不得继续依赖 8–10px；建立可复用的文字和数值令牌。 |
| “经营 / 订单 / 商品 / 分析 / 我的”五 Tab。 | 首页由单张利润卡升级为“行业—成本—预算—风险”的经营判断簇。 |
| `notificationItems` 的预算、成本、订单、退款提醒逻辑及消息中心下钻。 | 首屏只挑选一项最高优先级提醒，同时保持顶部 ticker 作为轻量消息入口。 |
| Banner 的自动切换、手动选择、暂停与 `prefers-reduced-motion` 回退。 | 指示器、暂停按钮和提醒 ticker 的**实际可点击区域**达到 44px，并在系统减少动态设置变化时停止计时器。 |

苹果对 iOS 可读性、控件尺寸和可访问性的建议可作为本轮下限：关键文字在放大或低对比环境中仍须清晰、控件默认命中目标应足够大、风险状态不只通过颜色表达。[1] [2]

## 2. 当前代码锚点与目标文件

| 文件 | 现有职责 | P0 修改职责 |
|---|---|---|
| `client/src/pages/Home.tsx` | 派生 `budgetBurn` 与 `notificationItems`；渲染 `OperatingSnapshot`、Banner、趋势、预算和第一成本。 | 新增 `HomeDecision` 视图模型；将最高优先级风险纳入经营主卡；重排首页的经营数据与宣传模块。 |
| `client/src/hooks/useReducedMotion.ts`（新增） | 当前无统一 Hook，组件直接读取 `window.matchMedia`。 | 监听系统减少动态设置，返回响应式布尔值，供 Banner 与提醒计时器复用。 |
| `client/src/lib/home-decision.ts`（新增） | 当前首页判断散落在 `Home.tsx` 的 `budgetBurn`、`notificationItems` 与 JSX 中。 | 将首页显示用的行业、期间、利润、成本、预算与优先风险封装为纯函数，便于测试。 |
| `client/src/lib/home-decision.test.ts`（新增） | 当前缺少首页优先风险与展示口径的单测。 | 验证预算超支、预算风险、正常、订单预警和无数据的显示优先级。 |
| `client/src/index.css` | 存在多轮样式覆盖与大量 8–10px 局部字号。 | 追加一段明确优先级的 P0 令牌与首页覆盖；不在现有规则中继续分散插入覆盖。 |

## 3. P0-A：建立文字、数值和触控令牌

### 3.1 设计规则

当前 `index.css` 在趋势、Banner、消息与商品卡中大量使用 8–10px。P0 不要求把全部说明变大，而是把**用于判断、点击和核对**的信息提升到统一的可读档位。金额继续使用 IBM Plex Mono 与 `tabular-nums`；中文标题和正文继续使用 Noto Sans SC / MiSans。这样可保持账本的高密度，同时降低用户识别金额、状态、月份和动作的成本。[1]

建议将以下代码追加到 `index.css` 的末尾，作为唯一的 P0 覆盖层。变量值应在 390px、375px 和浏览器 125% 缩放下复核，不能只依据静态截图决定。

```css
/* P0 Apple-principles adaptation: readable ledger typography + touch targets. */
:root {
  --sq-type-display: 32px;
  --sq-type-metric: 18px;
  --sq-type-section: 16px;
  --sq-type-body: 13px;
  --sq-type-meta: 12px;
  --sq-type-micro: 11px;
  --sq-leading-body: 1.5;
  --sq-hit-target: 44px;
  --sq-focus-ring: 0 0 0 3px rgba(8, 127, 245, .22);
  --sq-risk-red: #d92d20;
  --sq-risk-amber: #b86c00;
}

.sq-finance {
  font-family: "IBM Plex Mono", monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.055em;
}

.sq-meta { font-size: var(--sq-type-meta); line-height: 1.35; }
.sq-micro { font-size: var(--sq-type-micro); line-height: 1.35; }

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 0;
  box-shadow: var(--sq-focus-ring);
}
```

随后用**白名单式选择器**替换关键模块的 8–10px，而不是搜索后全局替换。推荐的首批选择器如下。

```css
/* 首页和消息中心：可阅读的状态信息。 */
.header-reminder-ticker span,
.promotion-copy em,
.promotion-copy small,
.home-cost-trend > div em,
.home-cost-trend > section span > b,
.home-cost-trend > section span > em,
.notification-list b,
.notification-list em,
.notification-list small {
  font-size: var(--sq-type-micro);
}

/* 筛选、图例、列表辅助信息：用于操作或核对时使用 meta 档。 */
.month-filter select,
.order-filter-chips button,
.record-row em,
.cost-card-list em,
.chart-legend,
.budget-summary em {
  font-size: var(--sq-type-meta);
}

/* 金额与百分比统一为金融扫描样式。 */
.operating-snapshot b,
.home-data-row strong,
.notification-list b,
.home-cost-trend > section span > b {
  font-family: "IBM Plex Mono", monospace;
  font-variant-numeric: tabular-nums;
}
```

### 3.2 不应执行的全局改动

不要将所有 `font-size: 9px` 一律替换为 `12px`。图表中可纯装饰的辅助刻度、非交互 watermark 和长列表次级日期可以保留更小的视觉权重，但必须不承担关键判断。也不要把整个系统替换成 SF Pro；网页在 Windows 与 Android 环境中不保证 SF 可用，当前的中文字体栈加 IBM Plex Mono 金额更符合跨平台账本体验。

## 4. P0-B：首页经营判断视图模型与组件重构

### 4.1 问题定义

当前 `HomePage()`（`Home.tsx` 434–448 行）按“行业期间 → 经营利润卡 → Banner → 成本趋势 → 预算 → 第一成本”渲染。`OperatingSnapshot()`（106–110 行）只承载利润、净营收、本月成本与预算值；最高优先级风险仍停留在顶部 ticker 和消息中心。结果是用户需要跨越标题、主卡、顶部提醒和多个模块，才能拼出“我是什么行业、当月成本多少、预算是否失控、现在该做什么”。

P0 将上述信息整理为一个纯展示对象：**`HomeDecision`**。它只复用已经计算好的数据，不重新计算账本逻辑。

```ts
// client/src/lib/home-decision.ts
export type HomeRiskTone = "notice" | "attention" | "risk";

export type HomeDecision = {
  context: { industryLabel: string; periodLabel: string };
  result: { label: "经营利润" | "经营亏损"; amount: number };
  metrics: Array<{
    key: "revenue" | "cost" | "budget";
    label: string;
    amount: number;
    tone?: "normal" | "attention" | "risk";
  }>;
  priority: {
    id: string;
    tone: HomeRiskTone;
    title: string;
    action: string;
    target: "budget" | "orders" | "cards" | "records";
  } | null;
};

export function buildHomeDecision(input: {
  industryLabel: string;
  periodLabel: string;
  revenue: number;
  cost: number;
  operatingProfit: number;
  budgetRemaining: number;
  budgetState: "healthy" | "risk" | "over";
  notifications: Array<{
    id: string;
    tone: HomeRiskTone;
    title: string;
    action: string;
    target: HomeDecision["priority"] extends infer _ ? never : never;
  }>;
}): HomeDecision {
  const priority = input.notifications.find((item) => item.tone === "risk")
    ?? input.notifications.find((item) => item.tone === "attention")
    ?? input.notifications[0]
    ?? null;

  return {
    context: { industryLabel: input.industryLabel, periodLabel: input.periodLabel },
    result: {
      label: input.operatingProfit >= 0 ? "经营利润" : "经营亏损",
      amount: Math.abs(input.operatingProfit),
    },
    metrics: [
      { key: "revenue", label: "净营收", amount: input.revenue },
      { key: "cost", label: "本月成本", amount: input.cost },
      {
        key: "budget",
        label: input.budgetState === "over" ? "预算已超" : input.budgetState === "risk" ? "月末超支" : "预算剩余",
        amount: Math.abs(input.budgetState === "healthy" ? input.budgetRemaining : Math.min(input.budgetRemaining, 0)),
        tone: input.budgetState === "healthy" ? "normal" : input.budgetState,
      },
    ],
    priority: priority && {
      id: priority.id,
      tone: priority.tone,
      title: priority.title,
      action: priority.action,
      target: priority.target,
    },
  };
}
```

实际实现中，不要使用上方示例中为简化展示的条件类型。应从 `Home.tsx` 导出或迁移 `NotificationTarget` 与通知项的轻量 DTO，避免 `home-decision.ts` 反向依赖页面组件。推荐创建 `HomeDecisionTarget = "budget" | "orders" | "cards" | "records"` 作为 lib 内类型，再由页面的 `openNotificationTarget()` 映射到 `SubPage`。

### 4.2 `Home.tsx` 的最小改造步骤

在 `notificationItems` 的 `useMemo` 之后，增加一个 `homeDecision` 的 `useMemo`。依赖项严格限定为其读取字段，避免把 `book` 对象整个放入依赖数组。

```tsx
const homeDecision = useMemo(() => buildHomeDecision({
  industryLabel: template.label,
  periodLabel: currentPeriod,
  revenue: totals.revenue,
  cost: totals.totalCost,
  operatingProfit: totals.operatingProfit,
  budgetRemaining: totals.budgetRemaining,
  budgetState: budgetBurn.state,
  notifications: notificationItems,
}), [
  budgetBurn.state,
  currentPeriod,
  notificationItems,
  template.label,
  totals.budgetRemaining,
  totals.operatingProfit,
  totals.revenue,
  totals.totalCost,
]);
```

将现有 `OperatingSnapshot` 改为接收 `decision` 与 `onOpenPriority`。风险操作使用 `<button>`，但主卡容器必须是 `<section>`，以避免把按钮嵌套在可点击卡片中。

```tsx
function OperatingSnapshot({
  decision,
  onOpenPriority,
}: {
  decision: HomeDecision;
  onOpenPriority: (target: HomeDecisionTarget) => void;
}) {
  return (
    <section className="operating-snapshot home-decision" aria-labelledby="home-decision-title">
      <header className="home-decision-context">
        <span>{decision.context.industryLabel}</span>
        <span>{decision.context.periodLabel.replace("-", " 年 ")} 月</span>
      </header>

      <div className="home-decision-result">
        <span id="home-decision-title">{decision.result.label}</span>
        <strong className="sq-finance">{yuan(decision.result.amount)}</strong>
      </div>

      <dl className="home-decision-metrics">
        {decision.metrics.map((metric) => (
          <div key={metric.key} data-tone={metric.tone ?? "normal"}>
            <dt>{metric.label}</dt>
            <dd className="sq-finance">{yuan(metric.amount)}</dd>
          </div>
        ))}
      </dl>

      {decision.priority && (
        <button
          className="home-decision-risk"
          data-tone={decision.priority.tone}
          onClick={() => onOpenPriority(decision.priority!.target)}
        >
          <CircleAlert size={16} aria-hidden="true" />
          <span><em>优先处理</em><b>{decision.priority.title}</b></span>
          <small>{decision.priority.action}</small>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
```

调用处将替换为：

```tsx
<OperatingSnapshot
  decision={homeDecision}
  onOpenPriority={(target) => goSub(target)}
/>
```

`goSub(target)` 在现有联合类型下可安全工作，因为 `HomeDecisionTarget` 与可下钻的 `SubPage` 子集相同；若 TypeScript 不能缩窄，应创建显式映射 `const homeDecisionSubPage: Record<HomeDecisionTarget, SubPage>`，而不是使用 `as any`。

## 5. P0-C：减少动态、触控面积与风险语义

### 5.1 统一减少动态 Hook

当前 Banner 与提醒计时器在效果创建时分别调用 `window.matchMedia()`。这种写法能处理初始状态，但用户在页面打开后切换“减少动态”时，定时器不会重新同步。新增 Hook 后，所有自动轮播均能随系统偏好变化停止。

```ts
// client/src/hooks/useReducedMotion.ts
import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}
```

在 `Home.tsx` 中替换两段轮播 `useEffect` 的条件，并补全依赖项：

```tsx
const reducedMotion = useReducedMotion();

useEffect(() => {
  if (reducedMotion || promotionPaused) return;
  const timer = window.setInterval(
    () => setPromotionIndex((index) => (index + 1) % promotionBanners.length),
    4200,
  );
  return () => window.clearInterval(timer);
}, [promotionPaused, reducedMotion]);

useEffect(() => {
  if (reducedMotion || notificationItems.length < 2) return;
  const timer = window.setInterval(
    () => setReminderIndex((index) => (index + 1) % notificationItems.length),
    5200,
  );
  return () => window.clearInterval(timer);
}, [notificationItems.length, reducedMotion]);
```

提醒 ticker 不应设置 `aria-live="polite"`，否则每 5.2 秒会向读屏用户重复播报。它应保持为有准确 `aria-label` 的普通按钮；消息中心才是完整可阅读内容。Apple 同样建议谨慎使用自动、快速或闪烁动效，并响应减少动态设置。[2]

### 5.2 44px 命中区与视觉尺寸分离

圆点和暂停图标可保持视觉克制，但透明命中区必须放大。由于当前 `.promotion-dots button` 只有约 5–18px，建议把图形与按钮分离。

```tsx
<button className="promotion-dot-hit" aria-label="查看第 1 张宣传卡">
  <span className="promotion-dot" aria-hidden="true" />
</button>
```

```css
.promotion-dot-hit,
.promotion-motion-control,
.header-reminder-ticker {
  min-width: var(--sq-hit-target);
  min-height: var(--sq-hit-target);
}

.promotion-dot-hit {
  display: grid;
  padding: 0;
  place-items: center;
  background: transparent;
  border: 0;
}

.promotion-dot-hit .promotion-dot {
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, .38);
  border-radius: 999px;
}

.promotion-dot-hit[aria-current="true"] .promotion-dot {
  width: 15px;
  background: #fff;
}

.home-data-row,
.home-decision-risk {
  min-height: var(--sq-hit-target);
}
```

风险不只使用颜色。`home-decision-risk` 应同时具有风险图标、文本“优先处理”、风险金额或名称，以及 data-tone 对应的左侧状态线。例如 `risk` 使用红色线和 `CircleAlert`，`attention` 使用琥珀色线，`notice` 使用蓝色线；即使用户看不到颜色，也能通过词语和图标理解状态。[2]

## 6. 单元测试和类型检查要求

`home-decision.ts` 必须是纯函数，避免在组件测试中模拟 LocalStorage。最少新增以下用例：

| 用例 | 输入 | 断言 |
|---|---|---|
| 预算超支 | `budgetState = "over"`，提醒包含预算风险。 | 主卡预算标签为“预算已超”，优先风险选择 `risk` 通知。 |
| 月末风险 | `budgetState = "risk"`，无红色通知。 | 主卡预算标签为“月末超支”，优先风险选择琥珀提醒。 |
| 正常预算但订单低利润 | 预算健康，通知含订单 `risk`。 | 优先风险应是低利润订单，而不是健康预算提示。 |
| 无通知 | 空通知数组。 | 主卡不渲染风险按钮，基础财务数据不受影响。 |
| 负经营利润 | `operatingProfit < 0`。 | 结果文案为“经营亏损”，金额为绝对值，颜色由结果状态决定。 |

实施完成后运行：

```bash
pnpm run check
pnpm test
pnpm run build
```

并在 375×812、390×844、430×932 三个常见 iPhone CSS 视口检查：首屏不横向溢出；Banner 与提醒可键盘聚焦；浏览器缩放 125% 时核心金额与风险文案不重叠；`prefers-reduced-motion` 下自动切换停止。

## 参考

[1] [Apple Human Interface Guidelines — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)  
[2] [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
