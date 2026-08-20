# 算得清：四项 P0 审计问题的实施与代码改造指南

**版本：** v1.0　　**适用目标：** 先完成本地 Store 原型口径修正，再平移到微信云开发云函数。　　**关键决策：** 不在既有 `CostRecord.type` 上继续打补丁；以“结构化交易 + 分类会计角色 + 期间聚合 + 月报状态机”替换当前演示算法。

> 本文将审计报告中“趋势/上期由模拟比例生成”提升为第 4 项 P0：因为它与收入、退款及利润指标共同决定工作台、分析和月报的期间数值。只要其中任意一个仍是模拟值，系统就不能对外声称“本月/上月经营结果”。

## 1. 四项 P0 的依赖顺序

| P0 | 当前缺陷 | 首要改造对象 | 依赖关系 | 必须先于 |
|---|---|---|---|---|
| P0-1 | 固定 `baselineRevenue` 与手工收入相加，可能重复确认 | 交易来源与收入聚合 | 无 | 所有利润和报表指标 |
| P0-2 | `refund` 一律计入成本 | 退款/退货结构化模型 | P0-1 | 毛利、预算、隐性成本 |
| P0-3 | 用“收入 − 全部支出”显示“毛利率” | 分类会计角色与指标词典 | P0-1、P0-2 | 成本卡、工作台、分析页、报表 |
| P0-4 | 上月、趋势、月报由种子或比例缩放产生 | 真实期间聚合与月报状态机 | P0-1、P0-2、P0-3 | 所有同比/环比和历史图表 |

建议采用一次**小型账本内核重构**，而不是分别修四个页面。否则会再次出现“工作台一个口径、分析另一个口径、报表第三个口径”的问题。

## 2. 目标会计与经营口径

### 2.1 将交易类型、分类和现金影响拆开

当前 `type: expense | income | refund` 同时承担业务行为、利润表方向与现金方向，语义过载。新的模型采用三层字段。

| 层 | 字段 | 作用 | 示例 |
|---|---|---|---|
| 业务事件 | `eventType` | 用户做了什么 | `sale`、`expense`、`customer_refund`、`inventory_return`、`adjustment` |
| 利润表角色 | `ledgerRole` | 进入哪一项利润指标 | `revenue`、`cogs`、`opex`、`other_income`、`non_operating` |
| 现金影响 | `cashDirection` | 是否占用现金预算 | `inflow`、`outflow`、`none` |

在真实经营中，退款“退给客户的现金”与“退回库存可回收的销售成本”不是同一件事。前者减少净营收并产生现金流出，后者减少销售成本；若有退货运费、二次包装、平台退款手续费，则应作为 COGS 或经营费用的独立子项。[1] [2]

### 2.2 标准指标定义

| 指标 | 公式（金额均为分） | 页面名称 | 说明 |
|---|---|---|---|
| `grossSalesFen` | Σ 已确认销售收入 | 销售收入 | 不含其他收入与退款 |
| `refundsFen` | Σ 客户退款金额 | 退款/售后 | 单独呈现，不能混入成本 |
| `netRevenueFen` | 销售收入 + 其他经营收入 − 客户退款 | 净营收 | 所有利润率分母 |
| `cogsFen` | Σ `ledgerRole = cogs` | 销售成本 | 采购结转、直接人工、履约等，按行业配置 |
| `grossProfitFen` | 净营收 − 销售成本 | 毛利 | 对应毛利率 |
| `grossMarginRate` | 毛利 ÷ 净营收 | 毛利率 | 不扣营销、房租、管理费等期间费用 |
| `operatingExpenseFen` | Σ `ledgerRole = opex` | 经营费用 | 营销、租金、行政、平台固定费等 |
| `operatingProfitFen` | 毛利 − 经营费用 | 经营利润 | 可为负 |
| `operatingMarginRate` | 经营利润 ÷ 净营收 | 经营利润率 | 替代当前“全成本毛利率” |
| `cashOutflowFen` | Σ `cashDirection = outflow` | 现金流出 | 可包含退款现金流、资本性支出 |
| `budgetUsedRate` | 预算范围内支出 ÷ 预算 | 预算占用 | 需由预算策略显式定义 |

> 建议默认把“预算占用”定义为**经营费用预算占用**，即 `cogs + opex` 的可控经营支出，不把退款现金流、借款还款和资本性设备采购隐式混入。若商家采用现金预算，可在预算配置中将 `budgetBasis` 切换为 `cash_outflow`；页面必须标出当前基准。

## 3. P0-1：消除固定基准营收与手工收入重复确认

### 3.1 问题根因与决策

当前代码将模板中的 `baselineRevenue` 与用户新增的收入流水直接相加。模板营收是演示数据，用户收入是经营事实；两者没有 `mode` 字段来判断是否可叠加。真实模式下必须取消 `baselineRevenue` 对经营指标的影响，只在演示模式使用完整的演示交易集。[3]

采用两个明确模式：

| 模式 | 数据来源 | `baselineRevenue` 行为 | 使用场景 |
|---|---|---|---|
| `demo` | 种子交易与种子月报 | 不单独参与聚合；仅用于生成一次种子 `sale` 交易 | 首次体验、产品演示 |
| `live` | 用户创建/导入的真实交易 | 永远为 `0`，不参与指标 | 真实账本与微信小程序 |

### 3.2 类型改造

在 `client/src/lib/cost-book.ts` 中替换 `CostRecord` 的核心类型。金额统一为整数分，页面通过 `formatFen` 显示为元。

```ts
export type LedgerRole =
  | "revenue"
  | "other_income"
  | "cogs"
  | "opex"
  | "non_operating";

export type LedgerEventType =
  | "sale"
  | "income"
  | "expense"
  | "customer_refund"
  | "inventory_return"
  | "adjustment";

export type CashDirection = "inflow" | "outflow" | "none";

export type LedgerEntry = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  templateVersion: number;
  occurredAt: string;       // ISO 日期，替代 display-only date
  eventType: LedgerEventType;
  ledgerRole: LedgerRole;
  cashDirection: CashDirection;
  amountFen: number;
  categoryKey: string;
  merchant: string;
  note?: string;
  relatedEntryId?: string;  // customer_refund 指向原 sale；可为空
  supplierId?: string;
  status: "draft" | "posted" | "voided";
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  activeIndustryId: IndustryId;
  dataMode: "demo" | "live";
  budgetByIndustry: Record<IndustryId, {
    amountFen: number;
    basis: "operating_cost" | "cash_outflow";
  }>;
};
```

### 3.3 聚合代码替换

新增纯函数文件 `client/src/lib/ledger-metrics.ts`，禁止页面组件自行计算金额。`cost-book.ts` 只保存状态和调用纯函数。

```ts
export function buildMetrics(entries: LedgerEntry[], budget: Budget) {
  const posted = entries.filter((x) => x.status === "posted");
  const sum = (predicate: (x: LedgerEntry) => boolean) =>
    posted.filter(predicate).reduce((total, x) => total + x.amountFen, 0);

  const grossSalesFen = sum((x) => x.ledgerRole === "revenue" && x.eventType === "sale");
  const otherIncomeFen = sum((x) => x.ledgerRole === "other_income");
  const refundsFen = sum((x) => x.eventType === "customer_refund");
  const netRevenueFen = grossSalesFen + otherIncomeFen - refundsFen;
  const cogsFen = sum((x) => x.ledgerRole === "cogs");
  const operatingExpenseFen = sum((x) => x.ledgerRole === "opex");
  const grossProfitFen = netRevenueFen - cogsFen;
  const operatingProfitFen = grossProfitFen - operatingExpenseFen;
  const budgetBaseFen = budget.basis === "operating_cost"
    ? cogsFen + operatingExpenseFen
    : sum((x) => x.cashDirection === "outflow");

  return {
    grossSalesFen, otherIncomeFen, refundsFen, netRevenueFen,
    cogsFen, operatingExpenseFen, grossProfitFen, operatingProfitFen,
    grossMarginRate: rate(grossProfitFen, netRevenueFen),
    operatingMarginRate: rate(operatingProfitFen, netRevenueFen),
    budgetBaseFen,
    budgetUsedRate: rate(budgetBaseFen, budget.amountFen), // 不封顶
  };
}
```

### 3.4 页面调整

`Home.tsx` 中的工作台不再读取 `template.baselineRevenue`。对于没有销售收入的 live 账本，使用“本期暂无销售收入，请导入日结或记一笔销售收入”空状态，而不是展示模板营收。演示模式仍有种子销售交易，因此首屏完整。

```tsx
<Metric label="净营收" value={formatFen(metrics.netRevenueFen)} />
<Metric label="毛利率" value={formatRate(metrics.grossMarginRate)} />
<Metric label="经营利润率" value={formatRate(metrics.operatingMarginRate)} />
```

### 3.5 验收用例

| 输入 | 期望结果 |
|---|---|
| live 账本无 `sale`、仅录入一笔 `income` | 只以该笔 `other_income` 计算净营收；不叠加模板金额 |
| demo 账本种子销售 `¥214,300`，新增 `¥1,000` 销售 | 净营收变为 `¥215,300`，只增加一次 |
| 同一销售导入两次，携带同一外部单号 | 第二次返回幂等结果，不重复确认收入 |

## 4. P0-2：将退款、退货回收与退款手续费拆开

### 4.1 交易模型

退款页不再只提供“退款”类型按钮。用户需要选择退款性质，系统据此填充利润表角色和现金方向。

| 业务事件 | `eventType` | `ledgerRole` | `cashDirection` | 对净营收/成本的影响 |
|---|---|---|---|---|
| 客户退款 | `customer_refund` | `revenue` 的 contra 项 | `outflow` | 减少净营收 |
| 可二次销售的退货回收 | `inventory_return` | `cogs` 的 contra 项 | `none` | 减少销售成本 |
| 退货运费/处置 | `expense` | `cogs` | `outflow` | 增加销售成本 |
| 平台退款手续费 | `expense` | `opex` 或行业定义的 `cogs` | `outflow` | 增加费用，需明确分类 |

在小商家 MVP 中可以先只实现“客户退款 + 退款手续费”，将库存回收设为可选开关；但**不可继续把全部退款金额计入成本**。

### 4.2 表单代码建议

将 `RecordPage` 的 `recordType` 替换为 `eventType`，退款时动态显示关联原销售、退款金额和手续费字段。

```tsx
const [eventType, setEventType] = useState<LedgerEventType>("expense");
const isRefund = eventType === "customer_refund";

{isRefund && (
  <>
    <label>关联原销售（可选）<SalePicker value={relatedEntryId} onChange={setRelatedEntryId} /></label>
    <label>退款手续费（元）<MoneyInput value={refundFeeFen} onChange={setRefundFeeFen} /></label>
    <label>退货可回收成本（元）<MoneyInput value={recoveredCogsFen} onChange={setRecoveredCogsFen} /></label>
  </>
)}
```

保存时由一个工厂函数产生主退款分录和可选的附属调整分录，禁止由页面自行拼接不同方向的指标。

```ts
function createRefundEntries(input: RefundInput): LedgerEntry[] {
  const refund = makeEntry({
    eventType: "customer_refund",
    ledgerRole: "revenue",
    cashDirection: "outflow",
    amountFen: input.refundFen,
    relatedEntryId: input.saleId,
  });
  const fees = input.refundFeeFen > 0 ? [makeEntry({
    eventType: "expense", ledgerRole: "opex", cashDirection: "outflow",
    amountFen: input.refundFeeFen, categoryKey: "refund_fee",
  })] : [];
  const recovery = input.recoveredCogsFen > 0 ? [makeEntry({
    eventType: "inventory_return", ledgerRole: "cogs", cashDirection: "none",
    amountFen: -input.recoveredCogsFen, categoryKey: "inventory_recovery",
  })] : [];
  return [refund, ...fees, ...recovery];
}
```

### 4.3 预算规则

退款主分录不进入 `operating_cost` 预算，但进入 `cash_outflow` 预算。退款手续费和退货运费进入两类预算。这样商家能同时看到“经营预算”和“现金压力”，而非让一个百分比混淆两个问题。

### 4.4 验收用例

| 场景 | 净营收 | COGS | 经营费用 | 现金流出 |
|---|---:|---:|---:|---:|
| 销售 10,000，销售成本 4,000 | 10,000 | 4,000 | 0 | 0 |
| 客户退款 1,000 | 9,000 | 4,000 | 0 | 1,000 |
| 同时回收商品成本 300 | 9,000 | 3,700 | 0 | 1,000 |
| 手续费 30、退货运费 80 | 9,000 | 3,780 | 30 | 1,110 |

## 5. P0-3：把“毛利率”与“经营利润率”分开

### 5.1 行业分类需要会计角色

在 `IndustryTemplate.categories` 里增加 `ledgerRole`，不再仅有颜色和提示。分类预设允许同一行业的展示词不同，但 role 必须是稳定枚举。

```ts
type CategoryPreset = {
  key: string;
  label: string;
  color: string;
  ledgerRole: "cogs" | "opex" | "other_income" | "non_operating";
  budgetIncluded: boolean;
  hiddenCostBasisEligible?: boolean;
};

const ecommerceCategories: CategoryPreset[] = [
  { key: "goods_purchase", label: "商品采购", ledgerRole: "cogs", budgetIncluded: true },
  { key: "fulfillment", label: "履约物流", ledgerRole: "cogs", budgetIncluded: true },
  { key: "warehouse_packaging", label: "仓储包装", ledgerRole: "cogs", budgetIncluded: true },
  { key: "platform_fee", label: "平台佣金", ledgerRole: "opex", budgetIncluded: true },
  { key: "ad_spend", label: "广告投放", ledgerRole: "opex", budgetIncluded: true },
  { key: "labor", label: "人工工资", ledgerRole: "opex", budgetIncluded: true },
];
```

> 行业角色必须经过产品和财务口径确认。举例而言，平台佣金在某些经营分析中可纳入贡献毛利层，在会计展示中也可能作为销售费用；产品应支持配置，不应在页面硬编码。

### 5.2 成本卡的边界

成本卡内的 `unitCostFen` 仍可使用“材料 + 直接人工 + 分摊”的完全成本；但卡片必须显示两种比率：

```ts
const unitGrossMarginRate = rate(salePriceFen - unitCogsFen, salePriceFen);
const unitOperatingContributionRate = rate(
  salePriceFen - unitCogsFen - allocatedChannelFeeFen - allocatedAdFen,
  salePriceFen,
);
```

原有字段 `marginRate` 应重命名为 `unitGrossMarginRate`，并在 UI 使用“单项毛利率”。如包含广告、平台佣金或门店租金，显示“单项经营贡献率”，不能继续共用“毛利率”。

### 5.3 页面替换清单

| 页面 | 当前字段 | 替换为 |
|---|---|---|
| 工作台 KPI | `毛利率`（实为全成本） | `毛利率` + 可选 `经营利润率` |
| 分析页环图中心 | `毛利率` | 当前选择指标；默认 `经营利润率` 或明确“全成本利润率” |
| 成本卡 | `marginRate` | `单项毛利率`；可选 `经营贡献率` |
| 月报 | `margin`、`marginRate` | `grossProfit`、`grossMarginRate`、`operatingProfit`、`operatingMarginRate` |

### 5.4 验收用例

销售 `100,000`，COGS `45,000`，经营费用 `35,000`：页面应显示毛利 `55,000`、毛利率 `55.0%`、经营利润 `20,000`、经营利润率 `20.0%`。任一页面都不允许把 `20.0%` 标为“毛利率”。

## 6. P0-4：以真实期间聚合取代合成趋势与静态月报

### 6.1 统一期间函数

所有列表、工作台、分析和报表必须调用同一期间选择器。不要在组件内使用 `0.945`、`0.955` 等比例系数。

```ts
export type PeriodKey = `${number}-${string}`; // "2026-07"

export function entriesForPeriod(entries: LedgerEntry[], period: PeriodKey, industryId: IndustryId) {
  return entries.filter((entry) =>
    entry.status === "posted" &&
    entry.industryId === industryId &&
    entry.occurredAt.slice(0, 7) === period,
  );
}

export function monthSeries(entries: LedgerEntry[], industryId: IndustryId, endPeriod: PeriodKey, count = 6) {
  return buildPeriodKeys(endPeriod, count).map((period) => ({
    period,
    metrics: buildMetrics(entriesForPeriod(entries, period, industryId), budgetFor(period)),
  }));
}
```

`AnalysisPage` 中的 `analysisPeriod` 应改为 `selectedPeriod: PeriodKey`；“本月”“上月”分别计算当前系统月和上一个自然月。若没有记录，返回零值与“无可比期间数据”，绝不能显示比例缩放的伪历史。

### 6.2 月报状态机

```ts
export type MonthlyReport = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  templateVersion: number;
  period: PeriodKey;
  status: "draft" | "closed" | "superseded";
  metrics: MetricsSnapshot;
  categoryBreakdown: CategoryAggregate[];
  generatedAt: string;
  closedAt?: string;
  sourceEntryVersion: string; // 哈希或最后流水更新时间
};
```

规则如下：草稿月报每次读取时由同一 `buildMetrics` 计算；结账时生成冻结快照；结账后新增、修改或删除该期间流水时，拒绝操作或要求具备“重开月份”权限。若重开，旧报表标记 `superseded`，新报表保留版本链。

### 6.3 Store 与云函数落点

| 阶段 | Store 原型 | 微信云开发生产版 |
|---|---|---|
| 写流水 | `addEntries(entries)` 统一写入并刷新 selector | `records.create/update/remove` 事务写入 `records` |
| 查工作台 | `selectMetrics(state, period)` | `overview.get({ period })` |
| 查分析 | `selectAnalysis(state, period, metric)` | `analysis.get({ period, metric })` |
| 月报草稿 | `buildReportSnapshot(entries)` | `reports.preview({ period })` |
| 月结 | `closeReport(period)` 固化快照 | `reports.close({ period })`，事务写 `reports` 和审计日志 |

## 7. 建议的文件级修改顺序

| 顺序 | 文件 | 主要改动 |
|---:|---|---|
| 1 | `client/src/lib/ledger-types.ts`（新增） | `LedgerEntry`、`CategoryPreset`、`Metrics`、`MonthlyReport` 等类型 |
| 2 | `client/src/lib/ledger-metrics.ts`（新增） | 金额、汇率、分类聚合、期间聚合和指标纯函数 |
| 3 | `client/src/lib/cost-book.ts` | 删除 `baselineRevenue` 对 live 聚合的作用；调用 selector；替换 `CostRecord` |
| 4 | `client/src/pages/Home.tsx` | 替换收入/退款表单、指标标签、期间控件、趋势和报表展示 |
| 5 | `client/src/lib/ledger-metrics.test.ts`（新增） | 核心不变量和边界样本测试 |
| 6 | `docs/wechat-miniapp-foundation.md` | 将新字段和月结状态同步到云数据库/云函数契约 |

## 8. 迁移与回滚方案

### 8.1 本地原型迁移

1. 在 `loadState` 读取旧版本时检测 `schemaVersion`；无版本的现有 localStorage 视为 v1。
2. 备份旧 JSON 到 `sqd-mobile-book-v1-backup-{timestamp}`，再写 v2 状态；不原地覆盖后无回滚。
3. 将旧 `expense` 映射到目标分类的 `ledgerRole`；旧 `income` 默认映射为 `other_income`，并提示用户指定为销售收入或其他收入；旧 `refund` 映射为 `customer_refund`，默认不填可回收成本。
4. 删除 `baselineRevenue` 的实时参与；为 demo 账本生成一笔或多笔种子 `sale` 交易，金额等于旧演示营收。
5. 旧种子 `reports` 标记 `legacy_demo`，不与新期间指标混比；用户可一键重建演示月报。

### 8.2 安全回滚

发布前保留 v1 只读适配器一版。若 v2 迁移失败，恢复备份并显示“账本升级失败，未改动原数据”。真实云端上线后使用版本化迁移任务，禁止客户端直接批量改写已结月报。

## 9. 自动化测试最小集

| 用例 ID | 输入 | 关键断言 |
|---|---|---|
| T-01 | live 账本仅新增销售 `10000` 分 | 净营收 `10000`，不出现模板营收 |
| T-02 | 销售 `10000`、退款 `1000` | 净营收 `9000`；COGS 不因退款主分录增加 |
| T-03 | 退款 `1000` + 退货回收 `300` + 手续费 `30` | 净营收 `9000`、COGS 减 `300`、经营费用增 `30`、现金流出增 `1030` |
| T-04 | 净营收 `100000`、COGS `45000`、费用 `35000` | 毛利率 `55%`、经营利润率 `20%`，标签不同 |
| T-05 | 七月/六月各有不同记录 | “上月”只取六月，趋势点与月报草稿一致 |
| T-06 | 成本为预算 130% | 数值显示 `130%` 与超支金额；进度条可视觉封顶 |
| T-07 | 月报关闭后改该月流水 | 默认拒绝；重开期后创建替代版本并保留旧快照 |
| T-08 | BOM 批次产出从 1 份变 10 份 | 单位材料成本按产出变化，而不是只按金额求和 |

## 10. 实施节奏与验收门槛

第一提交只引入类型、纯函数和单元测试，保持 UI 可运行；第二提交切换本地 Store 和工作台/记账页；第三提交切换分析、趋势和报告；第四提交完成云函数同构实现。每提交都要求 `typecheck`、生产构建、T-01 至 T-08 通过，并用同一笔测试数据对比工作台、分析与月报草稿。

只有当以下三项都满足，才可把“经营仪表盘”从演示改称为真实账本：所有 live 指标仅由已过账交易聚合；退款与收入/成本分离；当期、上期、趋势和月报草稿对同一期间返回相同结果。

## 参考资料

[1]: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/ "IFRS 15 Revenue from Contracts with Customers"
[2]: https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/revenue_from_contrac/revenue_from_contrac_US/chapter_8_practical__US/82rights_of_return_US.html "PwC Viewpoint: Rights of return"
[3]: https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/ "IAS 2 Inventories"
[4]: ./functional-algorithm-audit-2026-08-20.md "功能性与算法科学性审计"
