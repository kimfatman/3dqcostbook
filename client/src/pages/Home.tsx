/**
 * 移动账本 App：四个一级入口与可返回的业务页面栈。
 * 所有金额、分类、流水、成本卡与图表均通过统一行业化 Store 读取和更新。
 * 视觉规范：Digital Blue #087FF5、深海军蓝 #0B1836、冷白背景与紧凑圆角卡片。
 * 工作台仅承载经营概览与高频操作；消息、正式报表和深度洞察通过各自的单一入口访问。
 */
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  LineChart,
  LogOut,
  MoreHorizontal,
  Moon,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sparkles,
  Sprout,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UsersRound,
  Utensils,
  WalletCards,
  Download,
  Sun,
} from "lucide-react";
import {
  calcCard,
  industryTemplates,
  type CostCard,
  type CostRecord,
  type IndustryId,
  type RecordType,
  type Report,
  type VisualSkin,
  useCostBook,
} from "@/lib/cost-book";
import { channelLabel, getOrderAfterSalesMetrics, recoveryStatusLabel, type OrderChannel, type RefundReason, type ReturnRecoveryStatus } from "@/lib/order-ledger";
import { breakEvenPrice, quotePrice } from "@/lib/pricing";
import { buildPriceSliderRange, clampSliderPrice } from "@/lib/pricing-slider";
import { buildPricingProfitTrend, buildSmoothPricingProfitPolyline } from "@/lib/pricing-profit-trend";
import { promotionBanners, type PromotionTarget } from "@/lib/promotion-banners";
import { availableMonths, matchesMonth, matchesQuery } from "@/lib/list-search";
import { buildBudgetBurn, buildCategoryDeltas, buildCostStructure, buildCostStructureComparison, buildDailySalesOrders, buildMonthlyCashFlow, buildMonthlyCostStack, buildPeriodSkuMetrics, buildRefundPareto, buildSalesTargetProgress, buildSkuRankings, buildSupplierCostRankings } from "@/lib/chart-metrics";
import { buildHiddenCostEstimates } from "@/lib/hidden-costs";
import { buildCostAnalysisSummary } from "@/lib/cost-analysis-summary";
import { buildHomeDecision, type HomeDecision, type HomeDecisionNotification, type HomeDecisionTarget } from "@/lib/home-decision";
import { buildHomeTimeRange, filterByHomeTimeRange, homeTimeRangeOptions, type HomeTimeRange, type HomeTimeRangeWindow } from "@/lib/home-time-range";
import { buildBusinessHealth, buildSalesTargetHistory } from "@/lib/health-metrics";
import { buildProfitTrendEvents, type ProfitTrendEvent } from "@/lib/profit-trend-events";
import { buildMetrics, entriesForPeriod, fromFen } from "@/lib/ledger-metrics";
import { buildSmoothLinePoints } from "@/lib/smooth-chart";
import { isNonNegativeNumber, isPositiveInteger, isPositiveMoney, toEditableNumber, toNumber, type EditableNumber } from "@/lib/editable-number";
import { businessDate } from "@/lib/business-date";
import { buildReportCsv } from "@/lib/report-export";
import { buildBillExportModel, downloadBillExport, type BillExportFormat } from "@/lib/bill-export";
import { createDraftMaterial, removeDraftMaterial, updateDraftMaterial, type DraftMaterial } from "@/lib/cost-card-draft";
import { groupSuppliers } from "@/lib/supplier-management";
import { costCardDisplayCopy } from "@/lib/template-display";
import { budgetValidationMessage, shouldConfirmDiscard, shouldShowProfileRecovery } from "@/lib/interaction-guards";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trpc } from "@/lib/trpc";
import { formatMoneyCompact } from "@/lib/money-display";
import { chartRole } from "@/lib/chart-page-roles";
import { navigationSearch, popNavigationStack, readNavigationState, type NavigationState, type NavigationSubPage, type NavigationTab } from "@/lib/navigation-state";
import { indirectCostAllocationMethodLabel, indirectCostKindLabel, type IndirectCostAllocationMethod, type IndirectCostAllocationMode, type IndirectCostKind, type IndirectCostSource } from "@/lib/indirect-costs";
import { CostCardMediaEditor, CostCardThumbnail } from "@/components/CostCardMedia";
import { ChartTooltip } from "@/components/ChartTooltip";
import { AnimatedChartValue } from "@/components/AnimatedChartValue";
import { useTheme } from "@/contexts/ThemeContext";
import "../cashflow-filter.css";

type TabId = NavigationTab;
type SubPage = NavigationSubPage;
type RecordFilter = "all" | RecordType;
type QuickAction = "order" | "budget" | "cards" | "record" | "analysis";
type NotificationTarget = HomeDecisionTarget;
type NotificationItem = HomeDecisionNotification & { copy: string };
type VisualSkinOption = { id: VisualSkin; label: string; detail: string; material: string };
type IndustryHomeProfile = {
  quick: { action: QuickAction; label: string; detail: string; icon: LucideIcon }[];
  insight: { eyebrow: string; title: string; copy: string; focusCategoryKey: string };
};

const requestedParams = new URLSearchParams(window.location.search);
const requestedScreen = requestedParams.get("screen");
const requestedQuery = requestedParams.get("q") || "";
const requestedMonth = requestedParams.get("month") || "all";
const initialNavigation = readNavigationState(window.location.search);
const initialTab: TabId = initialNavigation.tab;
const initialSubPage: SubPage = initialNavigation.subPage;
const initialRecordFilter: RecordFilter = ["all", "expense", "income", "refund"].includes(initialNavigation.recordContext?.filter || "") ? initialNavigation.recordContext?.filter as RecordFilter : "all";
const initialRecordMonth = initialNavigation.recordContext?.month || requestedMonth;
const initialRecordQuery = initialNavigation.recordContext?.query || requestedQuery;
const initialRecordCategoryKey = initialNavigation.recordContext?.categoryKey || "";
const initialRecordSkuId = initialNavigation.recordContext?.skuId || "";

const format = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yuan = (amount: number) => `¥${format.format(Number.isFinite(amount) ? amount : 0)}`;
const iconByIndustry: Record<IndustryId, LucideIcon> = { canteen: Utensils, retail: ShoppingBag, ecommerce: ShoppingCart, beauty: ClipboardList, stall: Store };
const industryHomeProfiles: Record<IndustryId, IndustryHomeProfile> = {
  canteen: { quick: [{ action: "order", label: "录菜品订单", detail: "菜品销量与食材成本", icon: Plus }, { action: "record", label: "记录食材成本", detail: "采购、损耗及时入账", icon: Plus }, { action: "cards", label: "菜品成本卡", detail: "配方、毛利与售价", icon: Utensils }], insight: { eyebrow: "餐饮经营提示", title: "先核对食材损耗与采购差价", copy: "把报损、日盘点与高耗用菜品放在同一张账里，避免毛利被看不见的食材损耗吞掉。", focusCategoryKey: "food_purchase" } },
  retail: { quick: [{ action: "order", label: "录零售订单", detail: "商品销售与进货成本", icon: Plus }, { action: "record", label: "记录进货成本", detail: "进货、折价及时入账", icon: Plus }, { action: "cards", label: "商品成本卡", detail: "进货、毛利与定价", icon: PackageOpen }], insight: { eyebrow: "零售经营提示", title: "低周转库存正在占用资金", copy: "优先筛选近 60 天未动销商品，结合折扣与搭售计划，把库存资金重新转成可售现金流。", focusCategoryKey: "goods_purchase" } },
  ecommerce: { quick: [{ action: "order", label: "记平台订单", detail: "SKU 销售与渠道费用", icon: Plus }, { action: "record", label: "记录推广成本", detail: "投放、佣金及时入账", icon: Plus }, { action: "cards", label: "商品成本卡", detail: "SKU 成本与毛利", icon: PackageOpen }], insight: { eyebrow: "电商经营提示", title: "退款与广告投放需要成对复核", copy: "先把退款后的实收与投放消耗放在同一张账，停掉低转化计划，再核对平台佣金和履约费用。", focusCategoryKey: "ad_spend" } },
  beauty: { quick: [{ action: "order", label: "登记到店服务", detail: "项目成交与服务耗用", icon: CalendarDays }, { action: "record", label: "记录耗材成本", detail: "工时、耗材及时入账", icon: Plus }, { action: "cards", label: "服务成本卡", detail: "耗用、工时与定价", icon: ClipboardList }], insight: { eyebrow: "美业经营提示", title: "低峰工时与爽约正在拉低利润", copy: "先看预约密度和技师排班，再为低峰时段设计到店提醒与复购方案，让可售工时真正转成收入。", focusCategoryKey: "technician_labor" } },
  stall: { quick: [{ action: "order", label: "记出摊订单", detail: "货品销售与当日成本", icon: Plus }, { action: "record", label: "记进货与摊费", detail: "当天收支及时入账", icon: ReceiptText }, { action: "analysis", label: "看尾货风险", detail: "折价与客流复核", icon: TrendingUp }], insight: { eyebrow: "出摊经营提示", title: "尾货折价要在日终前主动处理", copy: "按客流分批进货、记录摊位费占比，临近收摊优先清尾，别把固定成本和隔夜损耗留到明天。", focusCategoryKey: "clearance_loss" } },
};
const monthLabel = (month: string) => month === "all" ? "全部月份" : `${Number(month.slice(5))} 月`;
const refundReasonLabel = (reason: RefundReason) => ({ quality_issue: "质量问题", wrong_item: "错发漏发", customer_cancelled: "客户取消", logistics_delay: "物流延误", duplicate_order: "重复下单", other: "其他" })[reason];
const visualSkinOptions: VisualSkinOption[] = [
  { id: "soft", label: "柔光材质工作台", detail: "冷白矿物底板 · 陶瓷数据面 · 冰蓝焦点层", material: "mineral" },
  { id: "aurora", label: "极光玻璃工作台", detail: "冰雾玻璃 · 蓝紫折射 · 轻盈浮层", material: "aurora" },
  { id: "deep", label: "深海展示舱", detail: "深海环境 · 悬浮信息舱 · 冷光图表", material: "deep" },
];
function Highlight({ value, query }: { value: string; query: string }) {
  const keyword = query.trim();
  const start = value.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
  if (!keyword || start < 0) return <>{value}</>;
  const end = start + keyword.length;
  return <>{value.slice(0, start)}<mark>{value.slice(start, end)}</mark>{value.slice(end)}</>;
}
function EquationResult({ firstLabel, firstValue, secondLabel, secondValue, resultLabel, resultValue, detail }: { firstLabel: string; firstValue: string; secondLabel: string; secondValue: string; resultLabel: string; resultValue: string; detail: string }) {
  return <section className="equation-result"><span>本期核算</span><div><label><em>{firstLabel}</em><b>{firstValue}</b></label><i>−</i><label><em>{secondLabel}</em><b>{secondValue}</b></label><i>＝</i><label className="equation-outcome"><em>{resultLabel}</em><b>{resultValue}</b></label></div><p>{detail}</p></section>;
}
function OperatingSnapshot({ decision, range, hasData, costRate, profitMarginRate, profitDelta, onSelectRange }: { decision: HomeDecision; range: HomeTimeRangeWindow; hasData: boolean; costRate: number | null; profitMarginRate: number | null; profitDelta: number; onSelectRange: (range: HomeTimeRange) => void }) {
  const revenue = decision.metrics.find(metric => metric.key === "revenue");
  const cost = decision.metrics.find(metric => metric.key === "cost");
  const isLoss = decision.result.label === "经营亏损";
  const resultAmount = `${isLoss ? "−" : ""}${formatMoneyCompact(decision.result.amount)}`;
  return <section className={`operating-snapshot home-decision ${hasData ? "" : "is-empty"}`} aria-labelledby="home-decision-title">
    <div className="home-decision-topline"><span><b>经营概览</b><em>{range.dateLabel}</em></span><div className="home-range-switcher" role="group" aria-label="经营概览时间范围">{homeTimeRangeOptions.map((option) => <button key={option.value} type="button" aria-pressed={option.value === range.value} onClick={() => onSelectRange(option.value)}>{option.label}</button>)}</div></div>
    {hasData ? <>
      <div className="home-decision-result"><div><em>{range.label}经营结果</em><strong><b id="home-decision-title" className={`financial-amount financial-amount-primary${isLoss ? " is-loss" : ""}`} title={`${decision.result.label} ${yuan(decision.result.amount)}`} aria-label={`${decision.result.label} ${yuan(decision.result.amount)}`}>{resultAmount}</b><small>{decision.result.label}</small></strong></div><i className="profit-sculpture" aria-hidden="true"><span /><span /><span /><em /></i></div>
      <div className="home-decision-equation"><label><em>净营收</em><b className="financial-amount" title={yuan(revenue?.amount || 0)}>{formatMoneyCompact(revenue?.amount || 0)}</b></label><i>−</i><label><em>总成本</em><b className="financial-amount" title={yuan(cost?.amount || 0)}>{formatMoneyCompact(cost?.amount || 0)}</b></label><i>＝</i><label className="outcome"><em>{decision.result.label}</em><b className={`financial-amount${isLoss ? " is-loss" : ""}`} title={`${decision.result.label} ${yuan(decision.result.amount)}`}>{resultAmount}</b></label></div>
      <dl className="home-decision-metrics"><div><dt>成本 / 净营收</dt><dd>{costRate === null ? "—" : `${costRate}%`}</dd></div><div><dt>利润 / 净营收</dt><dd>{profitMarginRate === null ? "—" : `${profitMarginRate}%`}</dd></div><div className={profitDelta < 0 ? "is-negative" : ""}><dt>{range.comparisonLabel}</dt><dd title={yuan(profitDelta)}>{profitDelta >= 0 ? "+" : ""}{formatMoneyCompact(profitDelta)}</dd></div></dl>
    </> : <>
      <div className="home-decision-empty"><div><em>{range.label}尚无已入账数据</em><b id="home-decision-title">从一笔流水或订单开始</b><p>录入后会在这里显示净营收、成本与经营结果。</p></div><i className="profit-sculpture" aria-hidden="true"><span /><span /><span /><em /></i></div>
    </>}
  </section>;
}

function HomeReminderList({ items, onOpen, onOpenAll }: { items: NotificationItem[]; onOpen: (item: NotificationItem) => void; onOpenAll: () => void }) {
  const iconFor = (tone: NotificationItem["tone"]) => tone === "risk" ? <TrendingDown size={17} /> : tone === "attention" ? <CircleAlert size={17} /> : <TrendingUp size={17} />;
  return <section className="home-reminders home-chart-card"><div className="home-chart-head"><span>本月经营提醒</span><button onClick={onOpenAll}>全部 <ChevronRight size={14} /></button></div><div className="home-reminder-list">{items.slice(0, 3).map(item => <button key={item.id} data-tone={item.tone} onClick={() => onOpen(item)}><i>{iconFor(item.tone)}</i><span><b>{item.title}</b><em>{item.copy}</em></span><small>{item.action}<ChevronRight size={15} /></small></button>)}</div></section>;
}

function HomeOperationalMetrics({ rangeLabel, orderCount, averageOrderValue, refundAmount, refundCount }: { rangeLabel: string; orderCount: number; averageOrderValue: number; refundAmount: number; refundCount: number }) {
  return <section className="home-operational-metrics" aria-label={`${rangeLabel}经营补充指标`} data-testid="home-operational-metrics">
    <div><em>订单数</em><b>{orderCount}<small>笔</small></b><span>{orderCount > 0 ? "已录入订单" : "待记录订单"}</span></div>
    <div><em>客单价</em><b>{orderCount > 0 ? yuan(averageOrderValue) : "—"}</b><span>{orderCount > 0 ? "按订单成交额" : "暂无订单基数"}</span></div>
    <div className={refundAmount > 0 ? "has-refund" : ""}><em>退款影响</em><b>{refundAmount > 0 ? `−${yuan(refundAmount)}` : yuan(0)}</b><span>{refundCount > 0 ? `${refundCount} 笔已计入净营收` : `${rangeLabel}暂无退款`}</span></div>
  </section>;
}

type HomeRecentActivityItem = {
  id: string;
  source: "record" | "order";
  sourceId: string;
  title: string;
  detail: string;
  date: string;
  amount: number;
  tone: "income" | "expense" | "refund" | "order";
};

function HomeRecentActivity({ items, onOpenRecord, onOpenOrder, onOpenAll }: { items: HomeRecentActivityItem[]; onOpenRecord: (id: string) => void; onOpenOrder: (id: string) => void; onOpenAll: () => void }) {
  return <section className="home-recent-activity" aria-labelledby="home-recent-activity-title" data-testid="home-recent-activity">
    <div className="home-recent-activity-head"><span><em>最近动态</em><b id="home-recent-activity-title">最新入账与订单</b></span><button type="button" onClick={onOpenAll}>全部流水 <ChevronRight size={14} /></button></div>
    {items.length ? <div className="home-recent-activity-list">{items.map((item) => <button key={item.id} type="button" onClick={() => item.source === "order" ? onOpenOrder(item.sourceId) : onOpenRecord(item.sourceId)}><i className={item.tone}>{item.tone === "order" ? <ClipboardList size={16} /> : <ReceiptText size={16} />}</i><span><b>{item.title}</b><em>{item.detail} · {item.date.replaceAll("-", "/")}</em></span><strong className={item.tone === "income" || item.tone === "order" ? "income" : "expense"}>{item.tone === "income" || item.tone === "order" ? "+" : "−"}{yuan(item.amount)}</strong><ChevronRight size={15} /></button>)}</div> : <HomeChartEmpty title="暂无经营动态" copy="从记一笔或记录订单开始，最新变动会出现在这里" action="记一笔" onClick={onOpenAll} />}
  </section>;
}

function notificationImpact(item: NotificationItem) {
  const amount = item.title.match(/¥[\d,]+/)?.[0];
  if (amount) return amount;
  if (item.id === "order-warning") return "利润风险";
  if (item.id === "refund-watch") return "退款影响";
  if (item.id.startsWith("card-")) return "成本波动";
  return "经营提醒";
}
function ProfitWaterfall({ revenue, cogs, expenses, profit, onSelect }: { revenue: number; cogs: number; expenses: number; profit: number; onSelect: (key: "revenue" | "cogs" | "expenses" | "profit") => void }) {
  const steps = [{ key: "revenue" as const, label: "净营收", from: 0, to: revenue, amount: revenue, kind: "revenue" }, { key: "cogs" as const, label: "销售成本", from: revenue, to: revenue - cogs, amount: -cogs, kind: "cost" }, { key: "expenses" as const, label: "经营费用", from: revenue - cogs, to: profit, amount: -expenses, kind: "expense" }, { key: "profit" as const, label: profit >= 0 ? "经营利润" : "经营亏损", from: 0, to: profit, amount: profit, kind: profit >= 0 ? "profit" : "loss" }];
  const low = Math.min(0, ...steps.flatMap((step) => [step.from, step.to]));
  const high = Math.max(1, ...steps.flatMap((step) => [step.from, step.to]));
  const range = high - low;
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? grossProfit / revenue * 100 : 0;
  const expenseRate = revenue > 0 ? expenses / revenue * 100 : 0;
  return <section className="profit-waterfall template-waterfall"><div className="chart-heading"><span>本期利润形成</span><b>{profit >= 0 ? "经营利润" : "经营亏损"} {profit < 0 ? "−" : ""}{yuan(Math.abs(profit))}</b><small>从净营收到经营结果</small></div><div className="waterfall-plot">{steps.map((step) => { const bottom = (Math.min(step.from, step.to) - low) / range * 100; const height = Math.max(5, Math.abs(step.to - step.from) / range * 100); return <button key={step.key} className={step.kind} onClick={() => onSelect(step.key)}><i style={{ bottom: `${bottom}%`, height: `${height}%` }} /><strong>{step.amount < 0 ? "−" : ""}{yuan(Math.abs(step.amount))}</strong><span>{step.label}</span></button>; })}</div><div className="waterfall-insights" aria-label={`毛利率 ${grossMargin.toFixed(1)}%，费用率 ${expenseRate.toFixed(1)}%`}><span><em>毛利</em><b>{grossProfit < 0 ? "−" : ""}{yuan(Math.abs(grossProfit))}</b></span><span><em>毛利率</em><b>{grossMargin.toFixed(1)}%</b></span><span><em>费用率</em><b>{expenseRate.toFixed(1)}%</b></span></div></section>;
}

function ProfitTrend({ items, events, onOpen }: { items: { month: string; revenue: number; cost: number }[]; events: ProfitTrendEvent[]; onOpen: (month: string) => void }) {
  const points = items.map((item) => ({ ...item, profit: Number((item.revenue - item.cost).toFixed(2)) }));
  const hasData = points.some((item) => item.revenue !== 0 || item.cost !== 0);
  if (!hasData) return <section className="analysis-profit-trend ledger-surface"><div className="analysis-card-head"><div><h2>利润趋势</h2><span>近 6 月经营利润</span></div></div><HomeChartEmpty title="利润趋势待生成" copy="记录商品销售、其他收入和成本后自动汇总" action="记录交易" onClick={() => onOpen(items.at(-1)?.month || "")} /></section>;
  const low = Math.min(0, ...points.map((item) => item.profit));
  const high = Math.max(0, ...points.map((item) => item.profit));
  const range = Math.max(1, high - low);
  const coordinates = points.map((item, index) => ({ x: points.length === 1 ? 50 : 8 + index * 84 / (points.length - 1), y: 84 - (item.profit - low) / range * 70 }));
  const curve = buildSmoothLinePoints(coordinates);
  const zeroY = 84 - (0 - low) / range * 70;
  const area = `${curve} 92,${zeroY} 8,${zeroY}`;
  const latest = points.at(-1)!;
  const best = [...points].sort((left, right) => right.profit - left.profit)[0]!;
  const lowPoint = [...points].sort((left, right) => left.profit - right.profit)[0]!;
  return <section className="analysis-profit-trend ledger-surface" data-chart-template="profit-line"><div className="analysis-card-head"><div><h2>利润趋势</h2><span>近 6 月经营利润</span></div><ChartTooltip label="经营利润" value={latest.profit < 0 ? `−${yuan(Math.abs(latest.profit))}` : yuan(latest.profit)} detail="净营收减销售成本与经营费用；点击月份可查看该月流水。" /></div><div className="profit-trend-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`近 6 月经营利润趋势，最新月 ${latest.month} 为 ${latest.profit < 0 ? "亏损" : "利润"}${yuan(Math.abs(latest.profit))}`}><defs><linearGradient id="analysis-profit-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#087ff5" stopOpacity=".22" /><stop offset="100%" stopColor="#087ff5" stopOpacity="0" /></linearGradient></defs><line className="profit-trend-zero" x1="5" x2="95" y1={zeroY} y2={zeroY} /><polygon className="profit-trend-area" points={area} fill="url(#analysis-profit-area)" /><polyline className="profit-trend-line" points={curve} />{coordinates.map((point, index) => <circle key={points[index].month} className={`profit-trend-point${index === points.length - 1 ? " is-current" : points[index].profit === best.profit ? " is-best" : points[index].profit === lowPoint.profit ? " is-low" : ""}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? "2.8" : "1.65"} />)}</svg><div className="profit-trend-labels">{points.map((item) => <button key={item.month} type="button" onClick={() => onOpen(item.month)} aria-label={`查看 ${item.month} 的经营利润流水`}>{Number(item.month.slice(5))}月</button>)}</div></div>{events.length > 0 && <div className="profit-trend-events" aria-label="真实经营事件">{events.slice(0, 4).map((event) => <button key={event.id} type="button" className={event.type} onClick={() => onOpen(event.month)}><span>{Number(event.month.slice(5))}月 · {event.title}</span>{event.amount > 0 && <b>{event.type === "refunds" ? "退款 " : "成本 "}{yuan(event.amount)}</b>}<ChevronRight size={14} /></button>)}</div>}<div className="profit-trend-summary"><span><em>最新</em><b>{latest.profit < 0 ? "−" : ""}{yuan(Math.abs(latest.profit))}</b></span><span><em>最高</em><b>{Number(best.month.slice(5))}月 {best.profit < 0 ? "−" : ""}{yuan(Math.abs(best.profit))}</b></span><span><em>最低</em><b>{Number(lowPoint.month.slice(5))}月 {lowPoint.profit < 0 ? "−" : ""}{yuan(Math.abs(lowPoint.profit))}</b></span></div></section>;
}
function BudgetRing({ burn, onClick }: { burn: ReturnType<typeof buildBudgetBurn>; onClick: () => void }) {
  const usedRate = Math.min(100, Math.max(0, burn.usedRate));
  const forecastRate = Math.min(100, Math.max(0, burn.forecastRate));
  const tone = "#087ff5";
  return <button className={`budget-ring template-bullet-goal ${burn.state}`} data-chart-template="bullet-goal" onClick={onClick}><i style={{ background: `conic-gradient(${tone} 0 ${usedRate}%, #e9eef4 ${usedRate}% 100%)` }}><span><em>已用</em><b><AnimatedChartValue value={usedRate} format={(value) => `${Number(value.toFixed(1))}%`} /></b><strong><AnimatedChartValue value={burn.used} format={yuan} /></strong></span></i><div><label><em>本月预算</em><b>{yuan(burn.budget)}</b></label><label><em>剩余可用</em><b>{yuan(burn.remaining)}</b></label><div className="budget-bullet" aria-label={`已用预算 ${usedRate}%，月末预测 ${burn.forecastRate}%`}><i style={{ width: `${usedRate}%` }} /><em style={{ left: `${forecastRate}%` }} /><b /></div><p><span>已用 {usedRate}%</span><span>预计 {burn.forecastRate}%</span></p></div><small>{burn.state === "over" ? `已超预算 ${yuan(Math.abs(burn.remaining))}` : burn.state === "risk" ? `月末预计超预算 ${yuan(Math.max(0, burn.forecast - burn.budget))}` : `月末预计 ${yuan(burn.forecast)}`}</small></button>;
}
function RefundPareto({ items, onSelect }: { items: ReturnType<typeof buildRefundPareto>; onSelect: (reason: string) => void }) {
  if (!items.length) return <div className="chart-empty" data-chart-template="pareto-rank">本期无退款</div>;
  const max = Math.max(...items.map((item) => item.amount), 1);
  const topTwoShare = items.slice(0, 2).reduce((sum, item) => sum + item.share, 0);
  return <section className="refund-pareto template-pareto" data-chart-template="pareto-rank"><div className="chart-heading"><span>退款原因</span><ChartTooltip label="退款影响" value={yuan(items.reduce((sum, item) => sum + item.amount, 0))} detail="按退款金额排序；点击某一原因可查看对应订单。" /><b>{yuan(items.reduce((sum, item) => sum + item.amount, 0))}</b></div><div className="pareto-concentration"><span>前两原因占比</span><b>{topTwoShare.toFixed(1)}%</b><i><em style={{ width: `${Math.min(100, topTwoShare)}%` }} /></i></div>{items.slice(0, 6).map((item) => <button key={item.reason} onClick={() => onSelect(item.label)}><span>{item.label}<small>{item.quantity} 件 · 累计 {item.cumulativeShare}%</small></span><i><em style={{ width: `${Math.max(8, item.amount / max * 100)}%` }} /></i><strong>{yuan(item.amount)}</strong></button>)}</section>;
}

function HomeChartEmpty({ title, copy, action, onClick }: { title: string; copy: string; action: string; onClick: () => void }) {
  return <button className="home-chart-empty" onClick={onClick}><span>{title}</span><b>{copy}</b><small>{action}<ChevronRight size={15} /></small></button>;
}

function VisualSkinPicker({ skin, onChange }: { skin: VisualSkin; onChange: (skin: VisualSkin) => void }) {
  const { theme, toggleTheme } = useTheme();
  return <section className="visual-skin-picker" aria-labelledby="visual-skin-title"><div className="visual-skin-heading"><span><em>视觉皮肤</em><b id="visual-skin-title">选择你的经营工作台</b></span><small>切换不影响账本数据</small></div><div className="visual-skin-options">{visualSkinOptions.map((option) => <button key={option.id} className={`skin-option ${option.material} ${skin === option.id ? "active" : ""}`} aria-pressed={skin === option.id} onClick={() => onChange(option.id)}><i aria-hidden="true"><span /><span /><span /></i><span><b>{option.label}</b><em>{option.detail}</em></span>{skin === option.id ? <Check size={17} /> : <ChevronRight size={16} />}</button>)}</div><button className="chart-theme-toggle" type="button" onClick={toggleTheme}><span>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}<b>图表深色模式</b><em>{theme === "dark" ? "深色已开启" : "跟随浅色界面"}</em></span><strong>{theme === "dark" ? "切换浅色" : "切换深色"}<ChevronRight size={16} /></strong></button></section>;
}

function SalesOrdersTrend({ items, onOpenOrders, onRecordOrder }: { items: ReturnType<typeof buildDailySalesOrders>; onOpenOrders: () => void; onRecordOrder: () => void }) {
  const salesTotal = items.reduce((sum, item) => sum + item.sales, 0);
  const orderTotal = items.reduce((sum, item) => sum + item.orders, 0);
  if (!orderTotal) return <section className="home-chart-card home-sales-orders"><div className="home-chart-head"><span>销售动能 <ChartTooltip label="销售额与订单数" value="暂无订单" detail="销售额按订单成交日汇总；订单数为同一日期内已录入订单数。退款仍按实际退款日单独影响净营收。" /></span><b>近 7 日</b></div><HomeChartEmpty title="销售额 / 订单数" copy="近 7 日还没有订单数据" action="记录订单" onClick={onRecordOrder} /></section>;
  const maxSales = Math.max(...items.map((item) => item.sales), 1);
  const orderValues = items.map((item) => item.orders);
  const maxOrders = Math.max(...orderValues);
  const minOrders = Math.min(...orderValues);
  const latest = items.at(-1)!;
  const peakSales = items.reduce((peak, item) => item.sales > peak.sales ? item : peak, items[0]);
  const averageOrderValue = orderTotal > 0 ? salesTotal / orderTotal : 0;
  const lineCoordinates = items.map((item, index) => ({ x: 8 + index / Math.max(items.length - 1, 1) * 84, y: 88 - item.orders / maxOrders * 68 }));
  const curve = buildSmoothPricingProfitPolyline(lineCoordinates);
  const area = `${curve} 92,92 8,92`;
  return <section className="home-chart-card home-sales-orders template-hybrid-trend" data-testid="home-sales-orders-trend"><div className="home-chart-head"><span>销售动能 <ChartTooltip label="销售额与订单数" value={`${yuan(salesTotal)} · ${orderTotal} 笔`} detail="柱形按订单成交日汇总成交额，曲线表示同日订单数；退款不会倒灌至销售日。" /></span><b>近 7 日</b><button type="button" onClick={onOpenOrders}>订单明细 <ChevronRight size={14} /></button></div><button type="button" className="home-sales-orders-trigger" onClick={onOpenOrders} aria-label={`查看近 7 日销售订单趋势，订单成交额 ${yuan(salesTotal)}，${orderTotal} 笔订单`}><div className="sales-summary"><label><em>成交额</em><strong><AnimatedChartValue value={salesTotal} format={yuan} /></strong></label><label><em>订单数</em><strong><AnimatedChartValue value={orderTotal} format={(value) => `${Math.round(value)} 笔`} /></strong></label><small><i className="sales" />成交额　<i className="orders" />订单数</small></div><div className="sales-orders-plot"><div className="sales-bars">{items.map((item) => <span key={item.date}><i style={{ height: `${Math.max(item.sales > 0 ? 8 : 2, item.sales / maxSales * 100)}%` }} /><em>{Number(item.date.slice(-2))}日</em></span>)}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sales-orders-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0b1836" stopOpacity=".2" /><stop offset="100%" stopColor="#0b1836" stopOpacity="0" /></linearGradient></defs><polygon className="sales-orders-area" points={area} fill="url(#sales-orders-area)" /><polyline className="sales-orders-line" points={curve} />{lineCoordinates.map((point, index) => <circle key={items[index].date} className={`sales-orders-point${index === items.length - 1 ? " is-current" : items[index].orders === maxOrders ? " is-peak" : items[index].orders === minOrders ? " is-low" : ""}`} cx={point.x} cy={point.y} r={index === items.length - 1 ? "2.8" : "1.65"} />)}</svg></div><div className="trend-insights"><span><em>最新</em><b>{yuan(latest.sales)} · {latest.orders}笔</b></span><span><em>峰值</em><b>{Number(peakSales.date.slice(-2))}日 {yuan(peakSales.sales)}</b></span><span><em>客单</em><b>{yuan(averageOrderValue)}</b></span></div></button></section>;
}

function AnalysisControlHub({ progress, reports, onOpenTargets, onOpenIndirectCosts, onOpenReport, onOpenAllReports }: { progress: ReturnType<typeof buildSalesTargetProgress>; reports: Report[]; onOpenTargets: () => void; onOpenIndirectCosts: () => void; onOpenReport: (id: string) => void; onOpenAllReports: () => void }) {
  const latestReport = reports[0];
  const targetSummary = progress ? { primary: `${progress.completionRate}%`, detail: `目标 ${yuan(progress.target)} · 已完成 ${yuan(progress.revenue)}` } : { primary: "待设置", detail: "设置目标后查看完成进度" };
  return <section className="analysis-control-hub ledger-page-shell" aria-label="经营控制与经营报表">
    <section className="analysis-control-surface ledger-surface"><div className="analysis-card-head"><div><h2>经营控制</h2><span>本月实时目标与费用设置</span></div></div><div className="analysis-control-actions"><button type="button" onClick={onOpenTargets}><span><em>月销售目标</em><b>{targetSummary.primary}</b><small>{targetSummary.detail}</small></span><ChevronRight size={17} /></button><button type="button" onClick={onOpenIndirectCosts}><span><em>间接费用项</em><b>费用归集与分摊</b><small>房租、水电、基础人工等经营费用</small></span><ChevronRight size={17} /></button></div></section>
    <section className="analysis-report-hub ledger-surface"><div className="analysis-card-head"><div><h2>经营报表</h2><span>正式月度报表，可封存与导出</span></div><button type="button" onClick={onOpenAllReports}>全部 <ChevronRight size={14} /></button></div>{latestReport ? <button className="analysis-report-latest" type="button" onClick={() => onOpenReport(latestReport.id)}><span><FileText size={18} /><i><b>{latestReport.month.replace("-", " 年 ")} 月经营报表</b><em>{latestReport.status === "closed" ? "已封存快照" : "实时草稿 · 可封存"}</em></i></span><strong>{latestReport.grossMarginRate}%<small>毛利率</small></strong><ChevronRight size={16} /></button> : <div className="analysis-report-empty">暂无月度经营报表；录入流水后将按当月口径生成实时草稿。</div>}</section>
  </section>;
}

export function SkuTopBars({ title, type, items, onSelect, onEmpty }: { title: string; type: "sales" | "profit"; items: ReturnType<typeof buildSkuRankings>["sales"]; onSelect: (id: string) => void; onEmpty: () => void }) {
  const value = (item: typeof items[number]) => type === "sales" ? item.netQuantity : item.grossProfit;
  const positiveItems = type === "profit" ? items.filter((item) => item.grossProfit > 0) : items;
  if (!positiveItems.length) return <section className="home-chart-card" data-chart-template="rank"><div className="home-chart-head"><span>{title}</span><b>Top 5</b></div><HomeChartEmpty title={type === "sales" ? "暂无商品销量" : "暂无正利润商品"} copy={type === "sales" ? "先记录带 SKU 的订单" : "先补齐商品售价、成本与订单"} action={type === "sales" ? "记录订单" : "查看商品"} onClick={onEmpty} /></section>;
  const max = Math.max(...positiveItems.map(value), 1);
  return <section className="home-chart-card home-sku-ranking" data-chart-template="rank"><div className="home-chart-head"><span>{title}</span><ChartTooltip label={type === "sales" ? "销量排行" : "利润排行"} value={type === "sales" ? `${positiveItems[0].netQuantity}${positiveItems[0].unit}` : yuan(positiveItems[0].grossProfit)} detail="按当前期间已入账订单汇总；点击条目可查看商品明细。" /><b>Top {positiveItems.length}</b></div><div>{positiveItems.map((item, index) => <button key={item.id} onClick={() => onSelect(item.id)}><em>{index + 1}</em><span><b>{item.name}</b><i><strong style={{ width: `${Math.max(7, value(item) / max * 100)}%` }} /></i></span><label>{type === "sales" ? <AnimatedChartValue value={item.netQuantity} format={(value) => `${Math.round(value)}${item.unit}`} /> : <AnimatedChartValue value={item.grossProfit} format={yuan} />}</label><ChevronRight size={15} /></button>)}</div></section>;
}

/* 首页成本结构以“总成本＝已分类成本＋未分类调整项”为唯一视觉口径。 */
const costRingColors = ["#087ff5", "#0b1836", "#62c5ff", "#4c6f9e", "#8cb5d8", "#b9d7ee", "#667085"];
function CostStructureRing({ items, totalCost, onSelect, onOpenCostReview, onEmpty }: { items: ReturnType<typeof buildCostStructure>; totalCost: number; onSelect: (key: string, label: string) => void; onOpenCostReview: () => void; onEmpty: () => void }) {
  if (!items.length) return <section className="home-chart-card" data-chart-template="composition"><div className="home-chart-head"><span>成本结构</span><b>本月</b></div><HomeChartEmpty title="暂无成本结构" copy="先记录进货、人工或经营费用" action="记录成本" onClick={onEmpty} /></section>;
  const categorizedCost = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const unclassifiedCost = Number(Math.max(0, totalCost - categorizedCost).toFixed(2));
  const costCredits = Number(Math.max(0, categorizedCost - totalCost).toFixed(2));
  const total = Math.max(categorizedCost, 1);
  const ringItems = [...items.map((item) => ({ ...item, share: Number((item.amount / total * 100).toFixed(1)) })), ...(unclassifiedCost > 0 ? [{ key: "__unclassified__", label: "未分类调整项", amount: unclassifiedCost, share: Number((unclassifiedCost / total * 100).toFixed(1)) }] : [])];
  let cursor = 0;
  const segments = ringItems.map((item, index) => { const start = cursor; cursor += item.share; return `${costRingColors[index % costRingColors.length]} ${start}% ${cursor}%`; }).join(", ");
  const largest = ringItems[0];
  return <section className="home-chart-card home-cost-structure template-composition" data-chart-template="composition"><div className="home-chart-head"><span>成本结构</span><ChartTooltip label="正向成本" value={yuan(categorizedCost)} detail="按已入账的正向成本分类汇总；点击分类可下钻至对应流水。" /><b>正向成本口径</b></div><div className="cost-structure-body"><i className="cost-ring" style={{ background: `conic-gradient(${segments})` }}><span><em>正向成本</em><b><AnimatedChartValue value={categorizedCost} format={(value) => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : yuan(value)} /></b><small>{costCredits > 0 ? `成本回冲 −${yuan(costCredits)}` : unclassifiedCost > 0 ? `已分类 ${yuan(categorizedCost)}` : "分类已核对"}</small></span></i><div>{ringItems.slice(0, 3).map((item, index) => <button key={item.key} onClick={() => item.key === "__unclassified__" ? onOpenCostReview() : onSelect(item.key, item.label)}><i style={{ background: costRingColors[index] }} /><span>{item.label}</span><b>{item.share}%</b><ChevronRight size={14} /></button>)}{unclassifiedCost > 0 && !ringItems.slice(0, 3).some((item) => item.key === "__unclassified__") && <button className="cost-adjustment-row" onClick={onOpenCostReview}><i style={{ background: costRingColors[ringItems.length - 1] }} /><span>未分类调整项</span><b>{yuan(unclassifiedCost)}</b><ChevronRight size={14} /></button>}</div></div><div className="composition-insight"><span>最大项</span><b>{largest.label} {largest.share}%</b><em>共 {ringItems.length} 类正向成本</em></div></section>;
}

function CostAnalysisPieChart({ items, grossCost, onSelect, onOpenAll }: { items: { key: string; label: string; amount: number }[]; grossCost: number; onSelect: (key: string, label: string) => void; onOpenAll: () => void }) {
  const positive = items.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const topItems = positive.slice(0, 5);
  const remainder = Number(Math.max(0, positive.slice(5).reduce((sum, item) => sum + item.amount, 0)).toFixed(2));
  const pieItems = remainder > 0 ? [...topItems, { key: "__other_categories__", label: "其他分类", amount: remainder }] : topItems;
  if (!pieItems.length || grossCost <= 0) return <section className="analysis-cost-composition ledger-surface" data-chart-template="pie"><div className="analysis-card-head"><h2>正向成本结构</h2><span>分类占比</span></div><div className="analysis-empty-copy">当前没有可展示的正向成本分类。</div></section>;
  let cursor = 0;
  const segments = pieItems.map((item, index) => { const share = Number((item.amount / grossCost * 100).toFixed(1)); const start = cursor; cursor += share; return `${costRingColors[index % costRingColors.length]} ${start}% ${cursor}%`; }).join(", ");
  const largest = pieItems[0];
  const previewItems = pieItems.slice(0, 3);
  const hiddenCategoryCount = Math.max(0, positive.length - previewItems.length);
  return <section className="analysis-cost-composition ledger-surface template-cost-pie" data-chart-template="pie"><div className="analysis-card-head"><div><h2>钱花在哪里</h2><span>正向成本按分类构成</span></div><strong title={yuan(grossCost)}>{formatMoneyCompact(grossCost)}</strong></div><div className="analysis-cost-pie-body"><i className="analysis-cost-pie" role="img" aria-label={`正向成本 ${yuan(grossCost)}；${pieItems.map((item) => `${item.label} ${Number((item.amount / grossCost * 100).toFixed(1))}%`).join("，")}`} style={{ background: `conic-gradient(${segments})` }} /><div className="analysis-pie-legend">{previewItems.map((item, index) => { const share = Number((item.amount / grossCost * 100).toFixed(1)); return <button key={item.key} onClick={() => item.key === "__other_categories__" ? onOpenAll() : onSelect(item.key, item.label)}><i style={{ background: costRingColors[index % costRingColors.length] }} /><span><b>{item.label}</b><em>{yuan(item.amount)}</em></span><strong>{share}%</strong><ChevronRight size={14} /></button>; })}{hiddenCategoryCount > 0 && <button className="analysis-pie-show-all" onClick={onOpenAll}><i style={{ background: "#8ca0b3" }} /><span><b>其他 {hiddenCategoryCount} 类</b><em>查看全部成本分类</em></span><strong>全部</strong><ChevronRight size={14} /></button>}</div></div><div className="analysis-cost-pie-insight"><span>最大驱动</span><b>{largest.label} {Number((largest.amount / grossCost * 100).toFixed(1))}%</b><em>{positive.length} 类真实正向成本</em></div></section>;
}

function StructureComparisonGroupedBars({ items, onSelect }: { items: ReturnType<typeof buildCostStructureComparison>; onSelect: (key: string, label: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return <div className="analysis-empty-copy" role="status">本期与上期均暂无可对照的正向成本。</div>;
  const maxShare = Math.max(1, ...items.map((item) => Math.max(item.share, item.previousShare)));
  const largestChange = [...items].sort((a, b) => Math.abs(b.shareDelta) - Math.abs(a.shareDelta))[0];
  const largestChangeCopy = largestChange.shareDelta === 0
    ? "各成本分类与上期持平"
    : `${largestChange.label}变化最大：${largestChange.shareDelta > 0 ? "上升" : "下降"} ${Math.abs(largestChange.shareDelta)} 个百分点`;
  const collapsed = items.length > 3 && !showAll;
  const visibleItems = collapsed ? [...items].sort((a, b) => Math.abs(b.shareDelta) - Math.abs(a.shareDelta)).slice(0, 3) : items;
  return <div className="analysis-grouped-comparison template-grouped-structure" aria-label="本期与上期正向成本占比变化"><p className="analysis-comparison-summary"><span>对比结论</span><b>{largestChangeCopy}</b><em>点击任一分类可查看本期与上期对应流水。</em></p>{visibleItems.map((item) => { const deltaLabel = item.shareDelta === 0 ? "0pt" : `${item.shareDelta > 0 ? "+" : ""}${item.shareDelta}pt`; return <button key={item.key} onClick={() => onSelect(item.key, item.label)}><span className="analysis-grouped-copy"><b>{item.label}</b><em>本期 {item.share}% · 上期 {item.previousShare}%</em></span><span className="analysis-grouped-bars" role="img" aria-label={`${item.label}：本期 ${item.share}%，上期 ${item.previousShare}%`}><i className="current" style={{ width: `${item.share / maxShare * 100}%` }} /><i className="previous" style={{ width: `${item.previousShare / maxShare * 100}%` }} /></span><strong className={item.shareDelta > 0 ? "up" : item.shareDelta < 0 ? "down" : "flat"}>{deltaLabel}</strong><ChevronRight size={15} /></button>; })}{collapsed && <button className="analysis-grouped-show-all" type="button" onClick={() => setShowAll(true)}>查看全部 {items.length} 类<ChevronDown size={14} /></button>}</div>;
}

function SalesTargetProgress({ progress, runRateForecast, editing, input, onInputChange, onEdit, onSave, onCancel, onOpenOrders }: { progress: ReturnType<typeof buildSalesTargetProgress>; runRateForecast: number; editing: boolean; input: string; onInputChange: (value: string) => void; onEdit: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; onOpenOrders: () => void }) {
  const stateCopy = progress?.state === "reached" ? "已完成目标，可继续复核利润" : progress?.state === "on_track" ? "按当前日均，月末可达目标" : "按当前日均，月末仍低于目标";
  if (editing) return <section className="home-chart-card home-sales-target target-editor"><div className="home-chart-head"><span>本月销售目标</span><b>编辑中</b></div><form onSubmit={onSave}><label>目标金额（元）<input autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" value={input} onChange={(event) => onInputChange(event.target.value)} placeholder="例如：300000" /></label><div><button type="button" onClick={onCancel}>取消</button><button type="submit">保存目标</button></div></form></section>;
  if (!progress) return <section className="home-chart-card home-sales-target target-unset"><div className="home-chart-head"><span>本月销售目标</span><b>待设置</b></div><div className="target-unset-body"><span><em>日均预计月末</em><b>{yuan(runRateForecast)}</b></span></div><div className="target-foot"><p>按真实销售运行率估算月末。</p><button onClick={onEdit}>设置本月销售目标 <ChevronRight size={15} /></button></div></section>;
  const ringRate = Math.min(100, Math.max(0, progress.completionRate));
  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringRate / 100);
  const ringSummary = `本月销售 ${yuan(progress.revenue)}，目标 ${yuan(progress.target)}，完成率 ${progress.completionRate}%`;
  const projectedRate = Math.min(100, Math.max(0, progress.projectedRate));
  return <section className={`home-chart-card home-sales-target template-bullet-goal ${progress.state}`} data-chart-template="bullet-goal"><div className="home-chart-head"><span>本月销售目标</span><button onClick={onEdit}>调整目标 <Pencil size={13} /></button></div><div className="sales-target-body"><div className="sales-target-ring" role="img" aria-label={ringSummary}><svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle className="sales-target-ring-track" cx="60" cy="60" r={ringRadius} /><circle className="sales-target-ring-progress" cx="60" cy="60" r={ringRadius} strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} /></svg><span><em>完成率</em><b>{progress.completionRate}%</b><small title={yuan(progress.revenue)}>{formatMoneyCompact(progress.revenue)}</small></span></div><div className="sales-target-stats"><label><em>目标</em><b title={yuan(progress.target)}>{formatMoneyCompact(progress.target)}</b></label><label><em>预计月末</em><b title={yuan(progress.projectedRevenue)}>{formatMoneyCompact(progress.projectedRevenue)}</b></label><label><em>{progress.remaining < 0 ? "超出" : "还需"}</em><b title={yuan(Math.abs(progress.remaining))}>{formatMoneyCompact(Math.abs(progress.remaining))}</b></label></div></div><div className="sales-target-bullet" aria-label={`当前完成 ${progress.completionRate}%，预计月末 ${progress.projectedRate}%`}><i style={{ width: `${Math.min(100, progress.completionRate)}%` }} /><em style={{ left: `${projectedRate}%` }} /><b /><span><small>当前 {progress.completionRate}%</small><small>预计 {progress.projectedRate}%</small></span></div>{progress.completionRate > 120 && <div className="sales-target-review" role="status"><span><CircleAlert size={16} aria-hidden="true" /><span><em>完成率 {progress.completionRate}%</em><b>目标可能偏低，建议调整下月目标</b></span></span><button type="button" onClick={onEdit}>复核目标 <Pencil size={13} /></button></div>}<div className="target-foot"><p>{progress.revenue > 0 ? `${stateCopy}。` : "目标已记录；录入本月销售后，完成环会自动填充。"}</p><button onClick={onOpenOrders}>查看订单明细 <ChevronRight size={15} /></button></div></section>;
}

/* 首页无订单时将目标与 SKU 缺口合并，避免两张等权空卡淹没成本判断。 */
function SalesBaselineGap({ progress, editing, input, onInputChange, onEdit, onSave, onCancel, hasSku, onPrimary, onOpenOrders }: { progress: ReturnType<typeof buildSalesTargetProgress>; editing: boolean; input: string; onInputChange: (value: string) => void; onEdit: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; hasSku: boolean; onPrimary: () => void; onOpenOrders: () => void }) {
  if (editing) return <SalesTargetProgress progress={progress} runRateForecast={0} editing input={input} onInputChange={onInputChange} onEdit={onEdit} onSave={onSave} onCancel={onCancel} onOpenOrders={onOpenOrders} />;
  const primaryLabel = hasSku ? "记录第一笔 SKU 订单" : "建立首张成本卡";
  return <section className="home-chart-card home-sales-baseline"><div className="home-chart-head"><span>销售基线</span><b>{progress ? "目标已设" : "待建立"}</b></div><div className="sales-baseline-rows"><div><em>本月销售目标</em><b>{progress ? yuan(progress.target) : "尚未设置"}</b><button onClick={onEdit}>{progress ? "调整" : "设置"}<ChevronRight size={14} /></button></div><div><em>SKU 订单</em><b>{hasSku ? "待记录成交" : "缺少商品成本"}</b><small>{hasSku ? "录入成交后生成销售、销量和利润图" : "先建成本卡，SKU 才能冻结成本"}</small></div></div><button className="sales-baseline-primary" onClick={onPrimary}>{primaryLabel}<ChevronRight size={16} /></button></section>;
}

const stackAreaColors = ["#087ff5", "#0b1836", "#62c5ff", "#4c6f9e", "#8cb5d8", "#f79009", "#667085", "#d3e1ee"];
function MonthlyCostStackChart({ stack, onOpen }: { stack: ReturnType<typeof buildMonthlyCostStack>; onOpen: (period: string) => void }) {
  if (!stack.canRender) return <section className="analysis-stack-card"><div className="analysis-card-head"><h2>成本趋势</h2><span>近 6 月</span></div><HomeChartEmpty title="成本趋势待补齐" copy="少于 2 个有成本月份，先补齐每月成本流水" action="记录成本" onClick={() => onOpen(stack.months.at(-1)?.period || "")} /></section>;
  const maxTotal = Math.max(...stack.months.map((month) => month.total), 1);
  const width = Math.max(stack.months.length - 1, 1);
  const xAt = (index: number) => index / width * 100;
  const yAt = (amount: number) => 100 - amount / maxTotal * 100;
  const bands = stack.categories.map((category, categoryIndex) => {
    let lower = 0;
    const lowerPoints = stack.months.map((month, monthIndex) => { const point = `${xAt(monthIndex)},${yAt(lower)}`; lower += month.values[category.key] || 0; return point; });
    lower = 0;
    const upperPoints = stack.months.map((month, monthIndex) => { lower += month.values[category.key] || 0; return `${xAt(monthIndex)},${yAt(lower)}`; });
    return { key: category.key, label: category.label, color: stackAreaColors[categoryIndex % stackAreaColors.length], d: `M ${lowerPoints.join(" L ")} L ${[...upperPoints].reverse().join(" L ")} Z` };
  });
  const latest = stack.months.at(-1)!;
  const previous = stack.months.at(-2)!;
  const delta = latest.total - previous.total;
  const largestCategory = stack.categories.map((category) => ({ ...category, amount: latest.values[category.key] || 0 })).sort((left, right) => right.amount - left.amount)[0];
  return <section className="analysis-stack-card template-layered-area"><div className="analysis-card-head"><h2>成本趋势</h2><span>近 6 月</span></div><div className="stack-legend">{bands.slice(0, 4).map((band) => <span key={band.key}><i style={{ background: band.color }} />{band.label}</span>)}{bands.length > 4 && <small>＋{bands.length - 4} 类</small>}</div><button className="stacked-area-chart" onClick={() => onOpen(latest.period)} aria-label={`查看 ${latest.period} 成本流水`}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g className="stack-grid"><line x1="0" x2="100" y1="25" y2="25" /><line x1="0" x2="100" y1="50" y2="50" /><line x1="0" x2="100" y1="75" y2="75" /></g>{bands.map((band) => <path key={band.key} d={band.d} fill={band.color} />)}</svg><div className="stack-x-labels">{stack.months.map((month) => <span key={month.period}>{Number(month.period.slice(5))}月</span>)}</div></button><div className="chart-compare-strip"><span><em>最新月</em><b>{yuan(latest.total)}</b></span><span className={delta > 0 ? "risk" : delta < 0 ? "positive" : ""}><em>较上月</em><b>{delta >= 0 ? "+" : "−"}{yuan(Math.abs(delta))}</b></span><span><em>最大分类</em><b>{largestCategory?.label || "—"}</b></span></div><div className="analysis-chart-action"><p>点击面积图可查看 {latest.period} 的已入账成本流水。</p><button onClick={() => onOpen(latest.period)}>查看成本流水 <ChevronRight size={15} /></button></div></section>;
}

function MonthlyCashFlowChart({ flow, onOpen, channelOptions, supplierOptions, channelFilter, supplierFilter, onChannelChange, onSupplierChange }: { flow: ReturnType<typeof buildMonthlyCashFlow>; onOpen: (period: string) => void; channelOptions: OrderChannel[]; supplierOptions: { id: string; name: string }[]; channelFilter: OrderChannel | "all"; supplierFilter: string; onChannelChange: (value: OrderChannel | "all") => void; onSupplierChange: (value: string) => void }) {
  if (!flow.canRender) return <section className="analysis-cashflow-card"><div className="analysis-card-head"><h2>现金流收支</h2><span>现金方向</span></div><HomeChartEmpty title="现金流方向待标记" copy="没有已标记流入或流出的分录，先记录收支" action="记录流水" onClick={() => onOpen(flow.months.at(-1)?.period || "")} /></section>;
  const max = Math.max(...flow.months.flatMap((month) => [month.inflow, month.outflow]), 1);
  const latest = flow.months.at(-1)!;
  const net = latest.inflow - latest.outflow;
  const largestGap = flow.months.reduce((current, month) => month.outflow - month.inflow > current.outflow - current.inflow ? month : current, flow.months[0]);
  return <section className="analysis-cashflow-card template-grouped-cashflow"><div className="analysis-card-head"><h2>现金流收支</h2><span>近 6 月</span></div><div className="cashflow-legend"><span><i className="inflow" />现金流入</span><span><i className="outflow" />现金流出</span></div>{(channelOptions.length > 0 || supplierOptions.length > 0) && <div className="cashflow-filter-panel">{channelOptions.length > 0 && <div><em>渠道</em><span><button className={channelFilter === "all" ? "active" : ""} onClick={() => onChannelChange("all")}>全部</button>{channelOptions.map((channel) => <button key={channel} className={channelFilter === channel ? "active" : ""} onClick={() => onChannelChange(channel)}>{channelLabel[channel]}</button>)}</span></div>}{supplierOptions.length > 0 && <div><em>供应商</em><span><button className={supplierFilter === "" ? "active" : ""} onClick={() => onSupplierChange("")}>全部</button>{supplierOptions.map((supplier) => <button key={supplier.id} className={supplierFilter === supplier.id ? "active" : ""} onClick={() => onSupplierChange(supplier.id)}>{supplier.name}</button>)}</span></div>}</div>}<div className="cashflow-bars">{flow.months.map((month) => <button key={month.period} onClick={() => onOpen(month.period)} aria-label={`查看 ${month.period} 当前条件下的现金流流水`}><span><i className="inflow" style={{ height: `${month.inflow / max * 100}%` }} /><i className="outflow" style={{ height: `${month.outflow / max * 100}%` }} /></span><em>{Number(month.period.slice(5))}月</em></button>)}</div><div className="cashflow-compare"><span><em>流入</em><b>{yuan(latest.inflow)}</b></span><span><em>流出</em><b>{yuan(latest.outflow)}</b></span><span className={net < 0 ? "risk" : "positive"}><em>净额</em><b>{net >= 0 ? "+" : "−"}{yuan(Math.abs(net))}</b></span></div><div className="cashflow-summary"><p>{largestGap.outflow > largestGap.inflow ? `${Number(largestGap.period.slice(5))}月净流出缺口最大` : "当前各月现金流保持净流入"}。</p><small>仅统计已标记现金方向的分录，不等同于利润；点击柱形可带入当前筛选下钻。</small></div></section>;
}

function BusinessHealthRadar({ health, onSelect, onOpenSettings }: { health: ReturnType<typeof buildBusinessHealth>; onSelect: (key: ReturnType<typeof buildBusinessHealth>["dimensions"][number]["key"]) => void; onOpenSettings: () => void }) {
  const dimensions = health.dimensions;
  const polar = (index: number, score: number) => { const angle = -Math.PI / 2 + index / dimensions.length * Math.PI * 2; const radius = 35 * score / 100; return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }; };
  const axis = dimensions.map((_, index) => polar(index, 100));
  const allScored = dimensions.every((dimension) => dimension.score !== null);
  const points = dimensions.map((dimension, index) => { const point = polar(index, dimension.score ?? 0); return `${point.x},${point.y}`; }).join(" ");
  return <section className="analysis-health-card template-health-score"><div className="analysis-card-head"><h2>经营健康度</h2><button onClick={onOpenSettings}>评分阈值 <Settings2 size={13} /></button></div><div className="health-radar-body"><div className="health-radar"><svg viewBox="0 0 100 100" role="img" aria-label={`经营健康度：已证据化 ${health.scoredCount} 个维度，共 ${health.totalDimensions} 个维度`}><g className="health-grid">{[20, 40, 60, 80, 100].map((level) => <polygon key={level} points={dimensions.map((_, index) => { const point = polar(index, level); return `${point.x},${point.y}`; }).join(" ")} />)}{axis.map((point, index) => <line key={dimensions[index].key} x1="50" y1="50" x2={point.x} y2={point.y} />)}</g>{allScored && <polygon className="health-shape" points={points} />}{dimensions.map((dimension, index) => { const point = polar(index, dimension.score ?? 0); const label = polar(index, 122); return <g key={dimension.key}><text x={label.x} y={label.y} textAnchor="middle">{dimension.label}</text>{dimension.score === null ? <circle className="health-missing" cx="50" cy="50" r="2.5" /> : <circle className="health-point" cx={point.x} cy={point.y} r="2.7" />}</g>; })}</svg><div className="health-score"><em>证据化评分</em><b>{health.score === null ? "待补数" : `${health.score}分`}</b><small>{health.scoredCount} / {health.totalDimensions} 维</small></div></div><div className="health-summary"><b>{health.score === null ? "当前未形成可评分维度" : `已汇总 ${health.scoredCount} 个有证据维度`}</b><span>{allScored ? "五维均已具备目标与账本证据。" : "待补数维度不计入总分，也不画为健康。"}</span><div className="health-bullet-overview" aria-label="健康维度评分概览">{dimensions.map((dimension) => <span key={dimension.key}><em>{dimension.label}</em><i><b style={{ width: `${dimension.score ?? 0}%` }} /></i><strong>{dimension.score === null ? "待补" : `${dimension.score}分`}</strong></span>)}</div></div></div><div className="health-dimension-list">{dimensions.map((dimension) => <button key={dimension.key} className={dimension.score === null ? "missing" : ""} onClick={() => onSelect(dimension.key)}><span><b>{dimension.label}</b><em>{dimension.score === null ? `待补数 · ${dimension.missing}` : `${dimension.score}分 · ${dimension.raw}`}</em><small>{dimension.formula}</small></span><ChevronRight size={16} /></button>)}</div><details className="health-formula"><summary>公开评分维度与计算规则</summary><p>销售进度、利润质量、成本控制、现金覆盖、售后质量均按上方公式从目标与已入账数据计算；目标、订单或现金方向缺失时，该维度显示待补数且不参与平均分。</p></details></section>;
}
const avatarPresets = [
  { id: "classic", label: "默认头像", Icon: UsersRound },
  { id: "retail", label: "零售店主", Icon: Store },
  { id: "ecommerce", label: "电商商家", Icon: ShoppingBag },
  { id: "canteen", label: "餐饮老板", Icon: ChefHat },
  { id: "beauty", label: "美业服务", Icon: Sparkles },
  { id: "stall", label: "小店摊主", Icon: Sprout },
] as const;
type AvatarPresetId = typeof avatarPresets[number]["id"];

function BrandAvatar({ assetId, preset = "classic", alt, size = "normal" }: { assetId?: string | null; preset?: string | null; alt: string; size?: "normal" | "large" | "mini" }) {
  const selected = avatarPresets.find(item => item.id === preset) || avatarPresets[0];
  const Icon = selected.Icon;
  return <span className={`brand-avatar brand-avatar-${size}`}>{assetId ? <img src={`/api/media/${assetId}`} alt={alt} /> : <Icon size={size === "large" ? 35 : size === "mini" ? 15 : 22} aria-label={alt} />}</span>;
}

const storePresets = [
  { id: "store", label: "通用店铺", Icon: Store },
  { id: "retail", label: "零售店", Icon: ShoppingCart },
  { id: "ecommerce", label: "电商店", Icon: ShoppingBag },
  { id: "canteen", label: "餐饮店", Icon: Utensils },
  { id: "beauty", label: "美业店", Icon: Sparkles },
  { id: "stall", label: "小店摊位", Icon: Sprout },
] as const;
type StorePresetId = typeof storePresets[number]["id"];

function BrandStoreLogo({ assetId, preset = "store", alt, size = "normal" }: { assetId?: string | null; preset?: string | null; alt: string; size?: "normal" | "header" | "mini" }) {
  const selected = storePresets.find(item => item.id === preset) || storePresets[0];
  const Icon = selected.Icon;
  const iconSize = size === "header" ? 9 : size === "mini" ? 13 : 20;
  return <span className={`store-preset-mark store-preset-mark-${size}${size === "header" ? " brand-store-logo" : ""}`}><Icon className="store-logo-fallback" size={iconSize} aria-label={alt} />{assetId && <img src={`/api/media/${assetId}`} alt={alt} onError={(event) => event.currentTarget.remove()} />}</span>;
}

const today = businessDate();
const HOME_RANGE_BUDGET = { amountFen: 0, basis: "operating_cost" as const };

export default function Home() {
  const book = useCostBook();
  useCloudBookSync(book);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const workspaceQuery = trpc.workspace.list.useQuery(undefined, { retry: false, enabled: Boolean(meQuery.data) });
  const utils = trpc.useUtils();
  const updateMe = trpc.profile.updateMe.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const updateWorkspace = trpc.workspace.updateProfile.useMutation({ onSuccess: () => utils.workspace.list.invalidate() });
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await Promise.all([utils.auth.me.invalidate(), utils.workspace.list.invalidate()]); } });
  const [tab, setTab] = useState<TabId>(initialTab);
  const [subPage, setSubPage] = useState<SubPage>(initialSubPage);
  const [pageStack, setPageStack] = useState<NavigationState[]>([]);
  const historyNavigationMode = useRef<"push" | "replace" | "pop">("push");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>(book.activeIndustryId);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>(initialRecordFilter);
  const [recordSearch, setRecordSearch] = useState(requestedScreen === "records" || ["record", "recordDetail"].includes(requestedScreen || "") ? initialRecordQuery : "");
  const [recordMonth, setRecordMonth] = useState(requestedScreen === "records" || ["record", "recordDetail"].includes(requestedScreen || "") ? initialRecordMonth : "all");
  const [recordChannelFilter, setRecordChannelFilter] = useState<OrderChannel | "all">("all");
  const [recordSupplierFilter, setRecordSupplierFilter] = useState("");
  const [recordCategoryFilter, setRecordCategoryFilter] = useState(initialRecordCategoryKey);
  const [recordSkuFilter, setRecordSkuFilter] = useState(initialRecordSkuId);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [customRecordCategoryOpen, setCustomRecordCategoryOpen] = useState(false);
  const [customRecordCategoryLabel, setCustomRecordCategoryLabel] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formMerchant, setFormMerchant] = useState("");
  const [formNote, setFormNote] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [recordMoreOpen, setRecordMoreOpen] = useState(false);
  const recordFormRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierEditId, setSupplierEditId] = useState<string | null>(null);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(() => ["cardDetail", "pricing"].includes(requestedScreen || "") ? book.cards[0]?.id ?? null : null);
  const [bomItemId, setBomItemId] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [cardMoreOpen, setCardMoreOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [analysisPeriod, setAnalysisPeriod] = useState<"current" | "last">("current");
  const [analysisDetailsOpen, setAnalysisDetailsOpen] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentAssetId, setAttachmentAssetId] = useState<string | null>(null);
  const [recordAttachmentSubjectId, setRecordAttachmentSubjectId] = useState<string | null>(null);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);
  const [voucherUploadError, setVoucherUploadError] = useState("");
  const [unsavedVoucherLeave, setUnsavedVoucherLeave] = useState<{ proceed: () => void } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [draftOrderLines, setDraftOrderLines] = useState<{ skuId: string; quantity: EditableNumber }[]>([]);
  const [draftMaterials, setDraftMaterials] = useState<DraftMaterial[]>([]);
  const [cardFormDirty, setCardFormDirty] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [pricingPlatformRate, setPricingPlatformRate] = useState<EditableNumber>(0);
  const [pricingFulfillmentCost, setPricingFulfillmentCost] = useState<EditableNumber>(0);
  const [pricingTargetMargin, setPricingTargetMargin] = useState<EditableNumber>(40);
  const [pricingPreviewPrice, setPricingPreviewPrice] = useState<number | null>(null);
  const [pricingChannel, setPricingChannel] = useState<OrderChannel>("platform");
  const [competitorLow, setCompetitorLow] = useState(0);
  const [competitorHigh, setCompetitorHigh] = useState(0);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [orderChannel, setOrderChannel] = useState<OrderChannel>("platform");
  const [orderMonth, setOrderMonth] = useState(requestedScreen === "orders" ? requestedMonth : "all");
  const [orderSearch, setOrderSearch] = useState(requestedScreen === "orders" ? requestedQuery : "");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "low_profit" | "refund" | "unreviewed">("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearchOpen, setOrderSearchOpen] = useState(Boolean(requestedQuery));
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [reminderIndex, setReminderIndex] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [salesTargetInput, setSalesTargetInput] = useState("");
  const [homeTimeRange, setHomeTimeRange] = useState<HomeTimeRange>("today");
  const [archivePeriod, setArchivePeriod] = useState(book.currentPeriod);
  const [cashChannelFilter, setCashChannelFilter] = useState<OrderChannel | "all">("all");
  const [cashSupplierFilter, setCashSupplierFilter] = useState("");
  const [indirectAllocationMode, setIndirectAllocationMode] = useState<IndirectCostAllocationMode>("allocated");
  const [indirectAllocationMethod, setIndirectAllocationMethod] = useState<IndirectCostAllocationMethod>("units");
  const [indirectCostEditId, setIndirectCostEditId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const currentWorkspace = workspaceQuery.data?.[0];

  useEffect(() => {
    if (historyNavigationMode.current === "pop") {
      historyNavigationMode.current = "push";
      return;
    }
    const nextSearch = navigationSearch({ tab, subPage, recordContext: { filter: recordFilter, month: recordMonth, query: recordSearch, categoryKey: recordCategoryFilter, skuId: recordSkuFilter } });
    if (window.location.search === nextSearch) return;
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const currentScreen = new URLSearchParams(window.location.search).get("screen") || "home";
    const nextScreen = subPage || tab;
    if (historyNavigationMode.current === "replace" || currentScreen === nextScreen) window.history.replaceState({ costBookNavigation: true }, "", nextUrl);
    else window.history.pushState({ costBookNavigation: true }, "", nextUrl);
    historyNavigationMode.current = "push";
  }, [recordCategoryFilter, recordFilter, recordMonth, recordSearch, recordSkuFilter, subPage, tab]);

  useEffect(() => {
    const restoreFromBrowserHistory = () => {
      const next = readNavigationState(window.location.search);
      historyNavigationMode.current = "pop";
      setPageStack((current) => popNavigationStack(current));
      setTab(next.tab);
      setSubPage(next.subPage);
      if (next.recordContext) {
        setRecordFilter(["all", "expense", "income", "refund"].includes(next.recordContext.filter || "") ? next.recordContext.filter as RecordFilter : "all");
        setRecordMonth(next.recordContext.month || "all");
        setRecordSearch(next.recordContext.query || "");
        setRecordCategoryFilter(next.recordContext.categoryKey || "");
        setRecordSkuFilter(next.recordContext.skuId || "");
      }
    };
    window.addEventListener("popstate", restoreFromBrowserHistory);
    return () => window.removeEventListener("popstate", restoreFromBrowserHistory);
  }, []);

  async function uploadMedia(file: File, kind: "user_avatar" | "workspace_logo" | "cost_card_image" | "record_voucher", subjectId: string) {
    if (!currentWorkspace) throw new Error("正在读取店铺资料，请稍后再试");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const sizeLimit = kind === "cost_card_image" || kind === "record_voucher" ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) throw new Error("仅支持 JPEG、PNG 或 WebP 图片");
    if (file.size > sizeLimit) throw new Error(`图片不能超过 ${sizeLimit / 1024 / 1024}MB`);
    const response = await fetch("/api/media/upload", { method: "POST", credentials: "include", headers: { "Content-Type": file.type, "x-workspace-id": currentWorkspace.id, "x-subject-id": subjectId, "x-media-kind": kind }, body: file });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "图片上传失败");
    return data as { id: string; url: string };
  }

  useEffect(() => {
    const shell = document.querySelector(".mobile-shell");
    shell?.classList.remove("skin-aurora", "skin-soft", "skin-deep");
    shell?.classList.add(`skin-${book.visualSkin}`);
  }, [book.visualSkin]);

  const { template, categories, records, cards, skus, skuMetrics, orders, refunds, suppliers, reports, totals, trend, currentPeriod, channelTemplates, orderWarnings, salesTarget, healthSettings, indirectCostPools, indirectCostAllocations, indirectCostUnitFenByCard } = book;
  const cardCopy = costCardDisplayCopy(template);
  const IndustryIcon = iconByIndustry[book.activeIndustryId];
  const isSub = subPage !== null;
  const categoryByKey = useMemo(() => new Map(categories.map((category) => [category.key, category])), [categories]);
  const activeRecord = records.find((record) => record.id === recordId) ?? null;
  const activeCard = cards.find((card) => card.id === cardId) ?? null;
  const activeReport = reports.find((report) => report.id === reportId) ?? null;
  const activeOrder = orders.find((order) => order.id === orderId) ?? null;
  const activeOrderLine = activeOrder?.lines.find((line) => line.id === orderLineId) ?? null;
  const activeBomItem = activeCard?.items.find((item) => item.id === bomItemId) ?? null;
  const directCardCost = activeCard ? calcCard(activeCard) : null;
  const activeCardIndirectCost = activeCard ? (indirectCostUnitFenByCard[activeCard.id] || 0) / 100 : 0;
  const cardCost = directCardCost ? { ...directCardCost, cost: Number((directCardCost.cost + activeCardIndirectCost).toFixed(2)), marginRate: activeCard?.salePrice ? Number(((activeCard.salePrice - (directCardCost.cost + activeCardIndirectCost)) / activeCard.salePrice * 100).toFixed(1)) : 0 } : null;
  const editingIndirectPool = indirectCostPools.find((pool) => pool.id === indirectCostEditId) ?? null;
  const recordCategoryOptions = useMemo(() => {
    const scoped = recordType === "income"
      ? categories.filter((category) => category.ledgerRole === "other_income")
      : recordType === "refund"
        ? categories.filter((category) => category.key === "returns" || category.key === "refund")
        : categories.filter((category) => category.ledgerRole === "cogs" || category.ledgerRole === "opex");
    const fallback = recordType === "refund" ? categories.filter((category) => category.ledgerRole === "other_income") : categories;
    const options = scoped.length ? scoped : fallback.length ? fallback : categories;
    const selected = categories.find((category) => category.key === selectedCategoryKey);
    return activeRecord && activeRecord.type === recordType && selected && !options.some((category) => category.key === selected.key) ? [selected, ...options] : options;
  }, [activeRecord, categories, recordType, selectedCategoryKey]);
  const currentCategoryKey = recordCategoryOptions.some((category) => category.key === selectedCategoryKey) ? selectedCategoryKey : recordCategoryOptions[0]?.key || "";
  const recordCategoryTitle = recordType === "income" ? "收入标签" : recordType === "refund" ? "退款标签" : "支出标签";
  const recordMerchantLabel = recordType === "income" ? "收款对象" : recordType === "refund" ? "退款对象" : "付款对象";
  const recordMerchantPlaceholder = recordType === "income" ? "例如：到店服务 / 客户" : recordType === "refund" ? "例如：退款客户 / 平台订单" : "例如：平台服务商";
  const recordMonths = useMemo(() => availableMonths(records.map((record) => record.date)), [records]);
  const orderMonths = useMemo(() => availableMonths(orders.map((order) => order.occurredAt)), [orders]);
  const [periodYear, periodMonth] = currentPeriod.split("-").map(Number);
  const daysInCurrentPeriod = new Date(periodYear, periodMonth, 0).getDate();
  const currentDay = Math.min(Number(today.slice(-2)), daysInCurrentPeriod);
  const homeRange = useMemo(() => buildHomeTimeRange(today, homeTimeRange), [homeTimeRange]);
  const activeLedgerEntries = useMemo(() => book.state.entries.filter((entry) => entry.industryId === book.activeIndustryId), [book.activeIndustryId, book.state.entries]);
  const homeRangeEntries = useMemo(() => filterByHomeTimeRange(activeLedgerEntries, homeRange), [activeLedgerEntries, homeRange]);
  const previousHomeRangeEntries = useMemo(() => filterByHomeTimeRange(activeLedgerEntries, { startDate: homeRange.previousStartDate, endDate: homeRange.previousEndDate }), [activeLedgerEntries, homeRange.previousEndDate, homeRange.previousStartDate]);
  const homeRangeMetrics = useMemo(() => buildMetrics(homeRangeEntries, HOME_RANGE_BUDGET), [homeRangeEntries]);
  const previousHomeRangeMetrics = useMemo(() => buildMetrics(previousHomeRangeEntries, HOME_RANGE_BUDGET), [previousHomeRangeEntries]);
  const homeRangeHasData = homeRangeEntries.some((entry) => entry.status === "posted");
  const homeRangeTotals = useMemo(() => ({
    revenue: fromFen(homeRangeMetrics.netRevenueFen),
    totalCost: fromFen(homeRangeMetrics.cogsFen + homeRangeMetrics.operatingExpenseFen),
    operatingProfit: fromFen(homeRangeMetrics.operatingProfitFen),
  }), [homeRangeMetrics]);
  const homeRangeProfitDelta = fromFen(homeRangeMetrics.operatingProfitFen - previousHomeRangeMetrics.operatingProfitFen);
  const homeRangeOrders = useMemo(() => filterByHomeTimeRange(orders, homeRange), [homeRange, orders]);
  const homeRangeRefunds = useMemo(() => filterByHomeTimeRange(refunds, homeRange), [homeRange, refunds]);
  const homeRangeGrossOrderSales = useMemo(() => homeRangeOrders.reduce((sum, order) => sum + order.lines.reduce((lineTotal, line) => lineTotal + line.quantity * line.unitPriceFen / 100, 0), 0), [homeRangeOrders]);
  const homeRangeAverageOrderValue = homeRangeOrders.length ? Number((homeRangeGrossOrderSales / homeRangeOrders.length).toFixed(2)) : 0;
  const homeRangeRefundAmount = useMemo(() => Number(homeRangeRefunds.reduce((sum, refund) => sum + refund.refundFen / 100, 0).toFixed(2)), [homeRangeRefunds]);
  const homeRangeDecision = useMemo(() => buildHomeDecision({ industryLabel: template.label, period: `${homeRange.startDate}~${homeRange.endDate}`, revenue: homeRangeTotals.revenue, cost: homeRangeTotals.totalCost, operatingProfit: homeRangeTotals.operatingProfit, budgetRemaining: 0, budgetState: "healthy", budget: 0, budgetForecast: 0, notifications: [] }), [homeRange.endDate, homeRange.startDate, homeRangeTotals.operatingProfit, homeRangeTotals.revenue, homeRangeTotals.totalCost, template.label]);
  const budgetBurn = useMemo(() => buildBudgetBurn({ budget: totals.budget, used: totals.totalCost, dayOfMonth: currentDay, daysInMonth: daysInCurrentPeriod }), [currentDay, daysInCurrentPeriod, totals.budget, totals.totalCost]);
  const notificationItems = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const topCategory = totals.categoryTotals[0];
    const risingCard = cards.find((card) => card.status === "risk" || card.status === "attention");
    const periodRefunds = refunds.filter((refund) => refund.occurredAt.startsWith(currentPeriod));
    if (budgetBurn.state === "over") items.push({ id: "budget-over", tone: "risk", title: `本月预算已超 ${yuan(Math.abs(totals.budgetRemaining))}`, copy: `本月成本已高于预算，${topCategory?.label || "经营成本"}需要优先复核。`, action: "查看本月预算结构", target: "budget" });
    else if (budgetBurn.state === "risk") items.push({ id: "budget-risk", tone: "attention", title: `本月月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}`, copy: `按当前入账节奏推算，建议先控制 ${topCategory?.label || "本月成本"}。`, action: "查看本月预算预测", target: "budget" });
    else items.push({ id: "budget-steady", tone: "notice", title: `本月月末预计结余 ${yuan(Math.max(0, budgetBurn.budget - budgetBurn.forecast))}`, copy: `本月预算仍可控，当前剩余 ${yuan(totals.budgetRemaining)}。`, action: "查看本月预算进度", target: "budget" });
    if (risingCard) items.push({ id: `card-${risingCard.id}`, tone: risingCard.status === "risk" ? "risk" : "attention", title: `${risingCard.name}成本需要复核`, copy: risingCard.status === "risk" ? "单位成本或售价存在风险，先检查材料、人工与分摊。" : "近期单位成本上升，建议核对供应商与成本构成。", action: "查看成本卡", target: "cards" });
    if (orderWarnings.length) items.push({ id: "order-warning", tone: "risk", title: `${orderWarnings.length} 笔订单低于利润目标`, copy: "渠道费用与商品成本已冻结，可优先复核低于保本价的成交。", action: "查看低利润订单", target: "orders" });
    if (periodRefunds.length) { const refundAmount = periodRefunds.reduce((sum, refund) => sum + refund.refundFen / 100, 0); items.push({ id: "refund-watch", tone: "attention", title: `本期退款 ${yuan(refundAmount)}`, copy: `${periodRefunds.length} 笔退款已同步影响本期净营收与商品成本。`, action: "查看退款订单", target: "orders" }); }
    if (topCategory && !risingCard) items.push({ id: `cost-${topCategory.key}`, tone: "notice", title: `${topCategory.label}占成本 ${Math.round(topCategory.amount / Math.max(totals.totalCost, 1) * 100)}%`, copy: "当前为第一成本，可在流水中核对相关支出明细。", action: "查看成本流水", target: "records" });
    return items;
  }, [budgetBurn, cards, currentPeriod, orderWarnings.length, refunds, totals.budgetRemaining, totals.categoryTotals, totals.totalCost]);
  const activeReminder = notificationItems[reminderIndex % notificationItems.length] || notificationItems[0];
  const unreadNotificationCount = notificationItems.filter((item) => !readNotificationIds.includes(item.id)).length;
  const homeDecision = useMemo(() => buildHomeDecision({ industryLabel: template.label, period: currentPeriod, revenue: totals.revenue, cost: totals.totalCost, operatingProfit: totals.operatingProfit, budgetRemaining: totals.budgetRemaining, budgetState: budgetBurn.state, budget: totals.budget, budgetForecast: budgetBurn.forecast, notifications: notificationItems }), [budgetBurn.forecast, budgetBurn.state, currentPeriod, notificationItems, template.label, totals.budget, totals.budgetRemaining, totals.operatingProfit, totals.revenue, totals.totalCost]);
  const costStructure = useMemo(() => buildCostStructure(totals.categoryTotals, 99), [totals.categoryTotals]);
  const salesTargetProgress = useMemo(() => buildSalesTargetProgress({ revenue: totals.revenue, targetFen: Math.round(salesTarget * 100), dayOfMonth: currentDay, daysInMonth: daysInCurrentPeriod }), [currentDay, daysInCurrentPeriod, salesTarget, totals.revenue]);
  const salesRunRateForecast = useMemo(() => Number((Math.max(0, totals.revenue) / Math.max(currentDay, 1) * daysInCurrentPeriod).toFixed(2)), [currentDay, daysInCurrentPeriod, totals.revenue]);
  const profitTrendEvents = useMemo(() => buildProfitTrendEvents({ months: trend.map((item) => item.month), industryId: book.activeIndustryId, orders, refunds, entries: book.state.entries }), [book.activeIndustryId, book.state.entries, orders, refunds, trend]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setPromotionIndex((index) => (index + 1) % promotionBanners.length), 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || notificationItems.length < 2) return;
    const timer = window.setInterval(() => setReminderIndex((index) => (index + 1) % notificationItems.length), 5200);
    return () => window.clearInterval(timer);
  }, [notificationItems.length, reducedMotion]);

  useEffect(() => {
    if (subPage !== "orderForm" || draftOrderLines.length || !skus.length) return;
    setDraftOrderLines([{ skuId: skus[0].id, quantity: 1 }]);
  }, [draftOrderLines.length, skus, subPage]);

  const filteredRecords = records.filter((record) => {
    const search = recordSearch.trim().toLowerCase();
    const matchesType = recordFilter === "all" || record.type === recordFilter;
    const matchesCurrentMonth = matchesMonth(record.date, recordMonth);
    const category = categoryByKey.get(record.categoryKey)?.label || "";
    const matchesSearch = matchesQuery([record.merchant, record.note, category, record.date], search);
    const recordChannel = record.orderId ? orders.find((order) => order.id === record.orderId)?.channel : undefined;
    const matchesSku = !recordSkuFilter || record.skuId === recordSkuFilter || Boolean(record.orderId && orders.find((order) => order.id === record.orderId)?.lines.some((line) => line.skuId === recordSkuFilter));
    const matchesChannel = recordChannelFilter === "all" || recordChannel === recordChannelFilter;
    const matchesSupplier = !recordSupplierFilter || record.supplierId === recordSupplierFilter;
    const matchesCategory = !recordCategoryFilter || record.categoryKey === recordCategoryFilter;
    return matchesType && matchesCurrentMonth && matchesSearch && matchesChannel && matchesSupplier && matchesCategory && matchesSku;
  });

  const filteredOrders = orders.filter((order) => {
    const search = orderSearch.trim().toLowerCase();
    const matchesCurrentMonth = matchesMonth(order.occurredAt, orderMonth);
    const relatedRefundReasons = refunds.filter((refund) => refund.orderId === order.id).map((refund) => refundReasonLabel(refund.reason));
    const matchesSearch = matchesQuery([order.orderNo, order.buyer, channelLabel[order.channel], order.occurredAt, ...relatedRefundReasons, ...order.lines.flatMap((line) => [line.skuName, line.skuCode])], search);
    const warning = orderWarnings.some((item) => item.orderId === order.id);
    const isRefunded = order.status === "partially_refunded" || order.status === "refunded";
    const matchesStatus = orderStatusFilter === "all" || (orderStatusFilter === "low_profit" && warning) || (orderStatusFilter === "refund" && isRefunded) || (orderStatusFilter === "unreviewed" && !order.reviewedAt);
    return matchesCurrentMonth && matchesSearch && matchesStatus;
  });

  const groupedRecords = useMemo(() => {
    const groups: { date: string; records: CostRecord[] }[] = [];
    filteredRecords.forEach((record) => {
      const group = groups.find((item) => item.date === record.date);
      if (group) group.records.push(record);
      else groups.push({ date: record.date, records: [record] });
    });
    return groups;
  }, [filteredRecords]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function guardUnsavedVoucher(leave: () => void) {
    if (subPage !== "record" || recordId || !attachmentAssetId) return false;
    setUnsavedVoucherLeave({ proceed: leave });
    return true;
  }
  function cancelVoucherLeave() { setUnsavedVoucherLeave(null); }
  function discardVoucherAndLeave() {
    const proceed = unsavedVoucherLeave?.proceed;
    setUnsavedVoucherLeave(null);
    setAttachmentAssetId(null);
    setRecordAttachmentSubjectId(null);
    setHasAttachment(false);
    setVoucherUploadError("");
    proceed?.();
  }
  function goSub(page: SubPage) { if (page === subPage) return; if (guardUnsavedVoucher(() => navigateToSubPage(page))) return; navigateToSubPage(page); }
  function navigateToSubPage(page: SubPage) { setPageStack((current) => [...current, { tab, subPage, recordContext: { filter: recordFilter, month: recordMonth, query: recordSearch, categoryKey: recordCategoryFilter, skuId: recordSkuFilter } }]); setSubPage(page); }
  function replaceSubPage(page: SubPage) { historyNavigationMode.current = "replace"; setPageStack((current) => current.slice(0, -1)); setSubPage(page); }
  function openRootTab(nextTab: TabId) { if (guardUnsavedVoucher(() => switchRootTab(nextTab))) return; switchRootTab(nextTab); }
  function switchRootTab(nextTab: TabId) { setPageStack([]); setSubPage(null); setTab(nextTab); }
  function openOrdersContext(filter: "all" | "low_profit" | "refund" = "all") {
    setOrderStatusFilter(filter);
    setOrderSearchOpen(false);
    openRootTab("orders");
  }
  function openPromotion(target: PromotionTarget) {
    if (target === "orders") { openOrdersContext(); return; }
    if (target === "notifications") { goSub("notifications"); return; }
    goSub(target);
  }
  function openNotificationTarget(item: NotificationItem) {
    setReadNotificationIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    if (item.target === "orders") { openOrdersContext(item.id === "refund-watch" ? "refund" : "low_profit"); return; }
    goSub(item.target);
  }
  function runQuickAction(action: QuickAction) {
    if (action === "order") { openNewOrder(); return; }
    if (action === "record") { openNewRecord(); return; }
    if (action === "budget") { goSub("budget"); return; }
    if (action === "cards") { goSub("cards"); return; }
    setTab("analysis");
  }
  function goBack() {
    if (shouldConfirmDiscard(cardFormDirty) && !window.confirm("当前成本卡修改尚未保存，确认放弃并返回吗？")) return;
    if (subPage === "cardForm") setCardFormDirty(false);
    if (guardUnsavedVoucher(performGoBack)) return;
    performGoBack();
  }
  function performGoBack() {
    if (pageStack.length) { window.history.back(); return; }
    if (subPage === "bomForm") { setSubPage("cardDetail"); return; }
    if (subPage === "pricing") { setSubPage("cardDetail"); return; }
    if (subPage === "cardForm") { setSubPage("cards"); return; }
    if (subPage === "record") { setSubPage("records"); return; }
    if (subPage === "recordDetail") { setSubPage("records"); return; }
    if (subPage === "cardDetail") { setSubPage("cards"); return; }
    if (subPage === "reportDetail") { setSubPage("reports"); return; }
    if (subPage === "supplierForm") { setSubPage("suppliers"); return; }
    if (subPage === "categoryForm") { setSubPage("categories"); return; }
    if (subPage === "orderForm") { setSubPage("orders"); return; }
    if (subPage === "orderDetail") { setSubPage("orders"); return; }
    if (subPage === "refundForm") { setSubPage("orderDetail"); return; }
    setSubPage(null);
  }

  function openNewRecord() {
    setRecordId(null);
    setRecordType("expense");
    const lastExpense = records.find((record) => record.type === "expense");
    const expenseCategoryKeys = categories.filter((category) => category.ledgerRole === "cogs" || category.ledgerRole === "opex").map((category) => category.key);
    setSelectedCategoryKey(lastExpense && expenseCategoryKeys.includes(lastExpense.categoryKey) ? lastExpense.categoryKey : categories[0]?.key || "");
    setSelectedSupplierId(lastExpense?.supplierId || "");
    setRecordMoreOpen(false);
    setHasAttachment(false);
    setAttachmentAssetId(null);
    setRecordAttachmentSubjectId(null);
    setVoucherUploadError("");
    setFormAmount("");
    setFormDate(today);
    setFormMerchant("");
    setFormNote("");
    goSub("record");
  }

  async function uploadRecordVoucher(file: File | undefined) {
    if (!file) return;
    const subjectId = recordId || recordAttachmentSubjectId || `record-${crypto.randomUUID()}`;
    setRecordAttachmentSubjectId(subjectId);
    setVoucherUploadError("");
    setIsUploadingVoucher(true);
    try {
      const asset = await uploadMedia(file, "record_voucher", subjectId);
      setAttachmentAssetId(asset.id);
      setHasAttachment(true);
      notify("凭证图片已附加，保存记录后生效");
    } catch (error) {
      setVoucherUploadError(error instanceof Error ? error.message : "凭证图片上传失败");
    } finally {
      setIsUploadingVoucher(false);
    }
  }

  function openRecordDetail(id: string) { setRecordId(id); goSub("recordDetail"); }
  function openCard(id: string) { setCardId(id); setCardMoreOpen(false); goSub("cardDetail"); }
  function openNewCard() { setCardId(null); setCardFormDirty(false); setDraftMaterials([createDraftMaterial(template.unitLabel, { name: "直接材料" })]); goSub("cardForm"); }
  function editCard() { if (!activeCard) return; setCardFormDirty(false); setDraftMaterials(activeCard.items.map((item) => createDraftMaterial(template.unitLabel, { id: item.id, name: item.name, spec: item.spec, quantity: item.quantity, amount: item.amount }))); goSub("cardForm"); }
  function openPricing() { if (!activeCard) return; const config = channelTemplates.platform; setPricingChannel("platform"); setPricingPlatformRate(config.commissionRatePct); setPricingFulfillmentCost(config.fulfillmentCost); setPricingTargetMargin(config.targetContributionMarginPct); setPricingPreviewPrice(null); setCompetitorLow(0); setCompetitorHigh(0); setPromotionDiscount(0); goSub("pricing"); }
  function openReport(id: string) { setReportId(id); goSub("reportDetail"); }
  function openOrder(id: string) { setOrderId(id); setOrderLineId(null); goSub("orderDetail"); }
  function openNewOrder() {
    if (!skus.length) {
      setDraftOrderLines([]);
      setOrderId(null);
      setOrderChannel("platform");
      goSub("orderForm");
      return;
    }
    setDraftOrderLines([{ skuId: skus[0].id, quantity: 1 }]);
    setOrderId(null);
    setOrderChannel("platform");
    goSub("orderForm");
  }
  function saveOrder(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (!draftOrderLines.length || draftOrderLines.some((line) => !line.skuId || !isPositiveInteger(line.quantity))) return notify("请为每个 SKU 填写正整数数量"); const lines = draftOrderLines.map((line) => ({ skuId: line.skuId, quantity: toNumber(line.quantity) })); const result = book.addOrder({ orderNo: String(data.get("orderNo") || ""), channel: orderChannel, buyer: String(data.get("buyer") || ""), date: String(data.get("date") || today), lines }); if (!result.ok) return notify(result.reason || "订单登记失败"); notify("订单已入账：销售收入、商品成本和渠道费用预警已同步生成"); replaceSubPage("orders"); }
  function saveRefund(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!activeOrder || !activeOrderLine) return notify("请先选择订单 SKU"); const data = new FormData(event.currentTarget); const quantity = Number(data.get("quantity")); const refundAmount = Number(data.get("refundAmount")); const date = String(data.get("date") || today); if (!Number.isInteger(quantity) || quantity <= 0) return notify("退款数量必须为正整数"); if (refundAmount > activeOrderLine.unitPriceFen / 100 * quantity) return notify("退款金额不能超过该 SKU 的成交收入"); if (date < activeOrder.occurredAt) return notify("退款日期不能早于订单成交日期"); const result = book.createRefund({ orderId: activeOrder.id, lineId: activeOrderLine.id, quantity, refundAmount, refundFee: Number(data.get("refundFee") || 0), reason: String(data.get("reason")) as RefundReason, recoveryStatus: String(data.get("recoveryStatus")) as ReturnRecoveryStatus, date }); if (!result.ok) return notify(result.reason || "退款登记失败"); notify("退款已登记，净营收与商品成本已同步更新"); replaceSubPage("orderDetail"); }
  function saveSkuCost(event: FormEvent<HTMLFormElement>, skuId: string) { event.preventDefault(); const cost = Number(new FormData(event.currentTarget).get("unitCost")); const result = book.updateSkuCost(skuId, cost); notify(result.ok ? "SKU 单位成本已更新，仅作用于后续订单" : result.reason || "成本更新失败"); }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persistRecord(event.currentTarget, false);
  }

  function saveRecordAndContinue() {
    persistRecord(recordFormRef.current!, true);
  }

  function persistRecord(form: HTMLFormElement, continueEntry: boolean) {
    const amount = Number(formAmount);
    const merchant = formMerchant.trim();
    const date = formDate;
    const note = formNote.trim();
    if (!amount || amount <= 0) return notify("请填写正确的金额");
    if (!merchant) return notify("请填写商户或对方名称");
    const data = new FormData(form);
    const refundFee = Number(data.get("refundFee") || 0);
    const recovery = Number(data.get("recovery") || 0);
    const payload = { categoryKey: currentCategoryKey, date, type: recordType, amount, merchant, note, status: "accounted" as const, hasAttachment, attachmentAssetId: attachmentAssetId || undefined, supplierId: recordType === "expense" ? selectedSupplierId || suppliers.find((supplier) => supplier.name === merchant)?.id : undefined, refundFee, recovery };
    if (recordId) {
      book.updateRecord(recordId, payload);
      notify(`已更新 ${yuan(amount)} 记录`);
    } else {
      book.addRecord({ ...payload, id: attachmentAssetId ? recordAttachmentSubjectId || undefined : undefined });
      notify(continueEntry ? "已保存，可继续录入" : `已新增 ${yuan(amount)} 记录`);
    }
    setRecordId(null);
    setUnsavedVoucherLeave(null);
    setAttachmentAssetId(null);
    setRecordAttachmentSubjectId(null);
    setVoucherUploadError("");
    if (continueEntry) {
      setFormAmount("");
      setFormMerchant("");
      setFormNote("");
      setSelectedSupplierId("");
      setHasAttachment(false);
      amountInputRef.current?.focus();
    } else {
      replaceSubPage("records");
    }
  }

  function changeRecordType(nextType: RecordType) {
    const options = nextType === "income"
      ? categories.filter((category) => category.ledgerRole === "other_income")
      : nextType === "refund"
        ? categories.filter((category) => category.key === "returns" || category.key === "refund")
        : categories.filter((category) => category.ledgerRole === "cogs" || category.ledgerRole === "opex");
    const fallback = nextType === "refund" ? categories.filter((category) => category.ledgerRole === "other_income") : categories;
    const nextOptions = options.length ? options : fallback;
    setRecordType(nextType);
    setSelectedCategoryKey((current) => nextOptions.some((category) => category.key === current) ? current : nextOptions[0]?.key || "");
    if (nextType !== "expense") setSelectedSupplierId("");
    setRecordMoreOpen(nextType !== "expense");
    setCustomRecordCategoryOpen(false);
    setCustomRecordCategoryLabel("");
  }

  function addCustomRecordCategory() {
    const label = customRecordCategoryLabel.trim();
    if (!label) return notify("请输入自定义标签名称");
    const key = `custom_${recordType}_${Date.now()}`;
    const ledgerRole = recordType === "income" ? "other_income" : "opex";
    book.addCategory({ key, label, color: recordType === "income" ? "#0F9D72" : recordType === "refund" ? "#F04438" : "#1677FF", hint: `自定义${recordCategoryTitle}`, ledgerRole });
    setSelectedCategoryKey(key);
    setCustomRecordCategoryLabel("");
    setCustomRecordCategoryOpen(false);
    notify(`已添加“${label}”标签`);
  }

  function editRecord() {
    if (!activeRecord) return;
    setRecordType(activeRecord.type);
    setSelectedCategoryKey(activeRecord.categoryKey);
    setHasAttachment(activeRecord.hasAttachment);
    setAttachmentAssetId(activeRecord.attachmentAssetId || null);
    setRecordAttachmentSubjectId(activeRecord.id);
    setVoucherUploadError("");
    setFormAmount(String(activeRecord.amount));
    setFormDate(activeRecord.date);
    setFormMerchant(activeRecord.merchant);
    setFormNote(activeRecord.note);
    setSelectedSupplierId(activeRecord.supplierId || "");
    setRecordMoreOpen(true);
    goSub("record");
  }

  function deleteRecord() {
    if (!activeRecord) return;
    if (!window.confirm(`确认删除“${activeRecord.merchant}”这笔记录吗？`)) return;
    book.removeRecord(activeRecord.id);
    notify("记录已删除，预算和分析已同步更新");
    setRecordId(null);
    replaceSubPage("records");
  }

  function applyIndustry() {
    if (selectedIndustry === book.activeIndustryId) return notify("当前已是该行业模板");
    book.switchIndustry(selectedIndustry);
    setSelectedCategoryKey("");
    openRootTab("profile");
    notify(`已切换为${industryTemplates[selectedIndustry].label}模板；历史账本已保留`);
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budget = Number(new FormData(event.currentTarget).get("budget"));
    const budgetErrorMessage = budgetValidationMessage(budget);
    if (budgetErrorMessage) { setBudgetError(budgetErrorMessage); return; }
    book.updateBudget(budget);
    setBudgetError("");
    notify("月度预算已保存，预测已刷新");
    replaceSubPage("budget");
  }

  function openSalesTargetEditor() {
    setSalesTargetInput(salesTarget > 0 ? String(salesTarget) : "");
    setTargetEditOpen(true);
  }

  function saveSalesTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = Number(salesTargetInput);
    if (!target || target <= 0) return notify("请输入正确的月销售目标");
    book.updateSalesTarget(target);
    setTargetEditOpen(false);
    notify("月销售目标已保存，完成率与月末预测已刷新");
  }

  function saveHealthSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = book.updateHealthSettings({ targetOperatingMarginPct: Number(data.get("targetOperatingMarginPct") || 0), refundTolerancePct: Number(data.get("refundTolerancePct") || 0) });
    if (!result.ok) return notify(result.reason);
    notify("健康度评分阈值已保存，缺口与评分已刷新");
    replaceSubPage("healthSettings");
  }

  function saveBomItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCard) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const amount = Number(data.get("amount"));
    if (!name || !amount || amount <= 0) return notify("请补充成本项名称和金额");
    const input = { name, amount, spec: String(data.get("spec") || ""), quantity: String(data.get("quantity") || "1 份") };
    const result = activeBomItem ? book.updateBomItem(activeCard.id, activeBomItem.id, input) : book.addBomItem(activeCard.id, input);
    if (!result.ok) return notify(result.reason);
    notify(activeBomItem ? "成本项已更新，单位成本和 SKU 已同步重算" : "成本项已加入，单位成本已重算");
    setBomItemId(null);
    replaceSubPage("cardDetail");
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const salePrice = Number(data.get("salePrice"));
    const labor = Number(data.get("labor") || 0);
    const overhead = Number(data.get("overhead") || 0);
    const items = draftMaterials.map(({ id: _draftId, ...item }) => ({ ...item, name: item.name.trim(), spec: item.spec.trim(), quantity: item.quantity.trim(), amount: toNumber(item.amount) }));
    if (!name || salePrice <= 0 || labor < 0 || overhead < 0) return notify("请填写名称、售价和正确的成本金额");
    if (!items.length || draftMaterials.some((item) => !item.name.trim() || !item.quantity.trim() || !isPositiveMoney(item.amount))) return notify("请至少保留一项材料，并补齐名称、数量和金额");
    const input = { name, kind: String(data.get("kind") || "").trim(), unit: String(data.get("unit") || "").trim(), salePrice, labor, overhead, items };
    setCardFormDirty(false);
    if (activeCard) { const result = book.updateCard(activeCard.id, input); if (!result.ok) return notify(result.reason); notify("成本卡已更新，SKU 将同步用于后续订单"); replaceSubPage("cardDetail"); }
    else { const result = book.addCard(input); if (!result.ok) return notify(result.reason); notify("成本卡已新增，并自动创建关联 SKU"); replaceSubPage("cards"); }
  }

  function deleteCard() {
    if (!activeCard || !window.confirm(`确认删除成本卡“${activeCard.name}”吗？删除仅影响成本卡本身，历史订单成本快照不受影响。`)) return;
    const result = book.removeCard(activeCard.id);
    notify(result.ok ? "成本卡和未使用 SKU 已删除" : result.reason || "无法删除成本卡");
    if (result.ok) { setCardId(null); replaceSubPage("cards"); }
  }

  function requestDeleteCard() {
    if (!activeCard) return;
    const blockReason = book.cardDeleteBlockReason(activeCard.id);
    if (blockReason) { notify(blockReason); return; }
    deleteCard();
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return notify("请输入供应商名称");
    const input = { name, contact: String(data.get("contact") || ""), categoryKey: String(data.get("categoryKey") || categories[0]?.key || ""), shared: data.get("shared") === "on" };
    if (supplierEditId) { book.updateSupplier(supplierEditId, input); notify("供应商信息已更新"); }
    else { book.addSupplier(input); notify("供应商已新增"); }
    setSupplierEditId(null);
    replaceSubPage("suppliers");
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") || "").trim();
    if (!label) return notify("请输入分类名称");
    const input = { label, color: String(data.get("color") || "#1677FF"), hint: String(data.get("hint") || "自定义分类").trim() || "自定义分类" };
    if (categoryEditId) { book.updateCategory(categoryEditId, input); notify("分类已更新，历史流水口径保持不变"); }
    else { book.addCategory({ key: `custom_${Date.now()}`, ...input }); notify("分类已新增"); }
    setCategoryEditId(null);
    replaceSubPage("categories");
  }

  function renderHeader() {
    const titles: Record<Exclude<SubPage, null>, string> = { notifications: "消息中心", industry: "切换行业", records: "经营流水", record: recordId ? "编辑记录" : "记一笔", recordDetail: "流水详情", cards: `${template.entityLabel}商品成本卡`, cardDetail: `${template.entityLabel}商品成本详情`, cardForm: activeCard ? `编辑${template.entityLabel}商品成本卡` : `添加${template.entityLabel}商品成本卡`, bomForm: activeBomItem ? `编辑${template.formulaLabel}项` : `添加${template.formulaLabel}项`, pricing: "智能测算定价", budget: "预算管理", healthSettings: "健康度评分阈值", salesTargets: "销售目标历史", reports: "经营报表", reportDetail: "经营报表详情", suppliers: "供应商", supplierForm: "新增供应商", categories: "分类管理", categoryForm: "新增分类", orders: "订单账本", orderForm: "记录订单", orderDetail: "订单详情", refundForm: "登记退款", skus: `SKU ${cardCopy.title}`, indirectCosts: "间接费用项", profileSettings: "个人与店铺资料", appearance: "外观设置", avatarStyle: "个人头像", storeBrand: "店铺品牌" };
    if (isSub) return <header className="page-header sub-header"><button className="back-button" onClick={goBack} aria-label="返回"><ArrowLeft size={21} /></button><strong>{titles[subPage]}</strong><span /></header>;
    return <header className={`page-header ${tab === "orders" ? "orders-prototype-header" : ""}`}><div className="brand-mini"><span className="brand-seal-stack"><img className="brand-seal" src="/brand-assets/SDQ_Logo_Mark.png" alt="算得清品牌标志" /><BrandStoreLogo assetId={currentWorkspace?.logoAssetId} preset={currentWorkspace?.logoPreset} alt={`${currentWorkspace?.name || template.storeName}店铺标识`} size="header" /></span><span><strong>{currentWorkspace?.name || template.storeName}<ChevronDown size={13} /></strong><em>{template.label} · {currentPeriod.replace("-", " 年 ")} 月</em></span></div><button className="header-icon" onClick={() => goSub("notifications")} aria-label={unreadNotificationCount ? `消息中心，${unreadNotificationCount} 条待查看` : "消息中心"}><Bell size={20} />{unreadNotificationCount > 0 && <i />}</button></header>;
  }

  function HomePage() {
    const IndustryIcon = iconByIndustry[book.activeIndustryId];
    const costRate = homeRangeTotals.revenue > 0 ? Number((homeRangeTotals.totalCost / homeRangeTotals.revenue * 100).toFixed(1)) : null;
    const profitMarginRate = homeRangeTotals.revenue > 0 ? Number((homeRangeTotals.operatingProfit / homeRangeTotals.revenue * 100).toFixed(1)) : null;
    const openHomeMonthRecords = (month: string) => { setRecordFilter("all"); setRecordSearch(""); setRecordMonth(month); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(""); goSub("records"); };
    return <div className="prototype-home home-redesign" data-chart-role={chartRole("home").primary}>
      <section className="dashboard-kicker home-context home-identity-context"><span><i><IndustryIcon size={15} aria-hidden="true" /></i><b>{template.storeName}</b><em>{homeDecision.context.industryLabel} · {homeDecision.context.period.replace("-", " 年 ")} 月</em></span></section>
      <OperatingSnapshot decision={homeRangeDecision} range={homeRange} hasData={homeRangeHasData} costRate={costRate} profitMarginRate={profitMarginRate} profitDelta={homeRangeProfitDelta} onSelectRange={setHomeTimeRange} />
      <HomeOperationalMetrics rangeLabel={homeRange.label} orderCount={homeRangeOrders.length} averageOrderValue={homeRangeAverageOrderValue} refundAmount={homeRangeRefundAmount} refundCount={homeRangeRefunds.length} />
      <ProfitTrend items={trend} events={profitTrendEvents} onOpen={openHomeMonthRecords} />
      {notificationItems.length ? <HomeReminderList items={notificationItems} onOpen={openNotificationTarget} onOpenAll={() => goSub("notifications")} /> : <section className="home-reminders home-chart-card" data-testid="home-reminders-empty"><div className="home-chart-head"><span>经营待办</span><button type="button" onClick={() => goSub("notifications")}>消息中心 <ChevronRight size={14} /></button></div><HomeChartEmpty title="暂无经营待办" copy="有新的利润、成本或退款提醒时，会在这里出现" action="查看消息中心" onClick={() => goSub("notifications")} /></section>}
    </div>;
  }

  function OrdersPage() {
    const hasFilter = orderMonth !== "all" || Boolean(orderSearch.trim()) || orderStatusFilter !== "all";
    const periodRefunds = refunds.filter((refund) => orderMonth === "all" || matchesMonth(refund.occurredAt, orderMonth));
    const refundPareto = buildRefundPareto(periodRefunds);
    const selectedOrders = filteredOrders.filter((order) => selectedOrderIds.includes(order.id));
    const allVisibleSelected = filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
    const toggleOrder = (orderId: string, checked: boolean) => setSelectedOrderIds((current) => checked ? Array.from(new Set([...current, orderId])) : current.filter((id) => id !== orderId));
    const toggleAllVisible = (checked: boolean) => setSelectedOrderIds((current) => checked ? Array.from(new Set([...current, ...filteredOrders.map((order) => order.id)])) : current.filter((id) => !filteredOrders.some((order) => order.id === id)));
    const updateSelectedReview = (reviewed: boolean) => { if (!selectedOrders.length) return; const action = reviewed ? "标记为已复核" : "恢复为待复核"; if (!window.confirm(`确认将 ${selectedOrders.length} 笔已选订单${action}？此操作仅更新复核状态，不会修改成交金额、退款、SKU、成本或历史快照。`)) return; book.setOrdersReviewed(selectedOrders.map((order) => order.id), reviewed); setSelectedOrderIds([]); notify(`已将 ${selectedOrders.length} 笔订单${action}`); };
    const exportSelectedOrders = async () => {
      if (!selectedOrders.length) return;
      if (!window.confirm(`确认导出 ${selectedOrders.length} 笔已选订单的账务流水？导出为只读 CSV，不会修改订单、退款、SKU 或成本快照。`)) return;
      const selectedIds = new Set(selectedOrders.map((order) => order.id));
      const selectedRecords = records.filter((record) => record.orderId && selectedIds.has(record.orderId));
      if (!selectedRecords.length) return notify("所选订单暂时没有可导出的账务流水");
      const model = buildBillExportModel({ records: selectedRecords, storeName: currentWorkspace?.name || template.storeName, industryLabel: template.label, filters: { month: orderMonth, type: "all", query: "已选订单" }, categoryLabel: (categoryKey) => categoryByKey.get(categoryKey)?.label || "未分类", channelLabel: (record) => record.orderId ? channelLabel[orders.find((order) => order.id === record.orderId)?.channel || "other"] : "", supplierName: (supplierId) => supplierId ? suppliers.find((supplier) => supplier.id === supplierId)?.name || "" : "", orderNo: (orderId) => orderId ? orders.find((order) => order.id === orderId)?.orderNo || "" : "" });
      await downloadBillExport(model, "csv");
      notify(`已导出 ${selectedOrders.length} 笔已选订单的账务流水`);
    };
    return <div className="prototype-orders ledger-page-shell"><section className="orders-page-title ledger-page-heading"><h1>订单</h1><div><button onClick={() => setOrderSearchOpen((value) => !value)} aria-label="搜索订单"><Search size={25} /></button><button onClick={openNewOrder} aria-label="新增订单"><Plus size={25} /></button></div></section><div className="orders-month-row"><label className="month-filter"><CalendarDays size={20} /><select aria-label="筛选订单月份" value={orderMonth} onChange={(event) => setOrderMonth(event.target.value)}><option value="all">全部月份</option>{orderMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div>{orderSearchOpen && <label className="search-field order-search"><Search size={16} /><input autoFocus value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="搜索订单号、客户或 SKU" /></label>}<div className="order-filter-chips"><button className={orderStatusFilter === "all" ? "active" : ""} onClick={() => setOrderStatusFilter("all")}>全部</button><button className={orderStatusFilter === "unreviewed" ? "active" : ""} onClick={() => setOrderStatusFilter("unreviewed")}>待复核</button><button className={orderStatusFilter === "low_profit" ? "active" : ""} onClick={() => setOrderStatusFilter("low_profit")}>低利润</button><button className={orderStatusFilter === "refund" ? "active" : ""} onClick={() => setOrderStatusFilter("refund")}>退款</button></div>{filteredOrders.length > 0 && <section className="order-batch-toolbar" aria-label="订单批量操作"><label><input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="全选当前筛选订单" /><span>全选</span></label><strong>{selectedOrders.length ? `已选 ${selectedOrders.length} 笔` : "选择订单后批量处理"}</strong><div><button type="button" disabled={!selectedOrders.length} onClick={() => updateSelectedReview(true)}>标记复核</button><button type="button" disabled={!selectedOrders.length} onClick={() => updateSelectedReview(false)}>取消复核</button><button type="button" disabled={!selectedOrders.length} onClick={() => void exportSelectedOrders()}><Download size={15} />导出</button></div></section>}<div className="order-list ledger-row-list">{filteredOrders.map((order) => { const afterSales = getOrderAfterSalesMetrics(order, refunds); const warning = orderWarnings.find((item) => item.orderId === order.id); const selected = selectedOrderIds.includes(order.id); return <article key={order.id} className={`order-list-item${selected ? " selected" : ""}${order.reviewedAt ? " reviewed" : ""}`}><label className="order-select"><input type="checkbox" checked={selected} onChange={(event) => toggleOrder(order.id, event.target.checked)} aria-label={`选择订单 ${order.orderNo || "未编号订单"}`} /><span aria-hidden="true" /></label><button className="order-list-main" onClick={() => openOrder(order.id)}><div><b><Highlight value={order.orderNo || "未编号订单"} query={orderSearch} /></b><em><Highlight value={order.buyer || "散客"} query={orderSearch} /></em><small><Highlight value={channelLabel[order.channel]} query={orderSearch} /> · {afterSales.hasAfterSale ? "有售后" : "无退款"} · <i className={order.reviewedAt ? "reviewed" : "unreviewed"}>{order.reviewedAt ? "已复核" : "待复核"}</i></small></div><span className="order-time">{order.occurredAt.slice(5)}<ChevronRight size={17} /></span><strong className="order-after-sales-metric"><b>{yuan(fromFen(afterSales.netRevenueFen))}</b><em>退款后净收入</em><small className={warning ? "attention" : ""}>{warning ? (warning.type === "below_break_even" ? "低于保本" : "低于目标") : `成本 ${yuan(fromFen(afterSales.operatingCostFen))} · 贡献 ${yuan(fromFen(afterSales.operatingContributionFen))}`}</small></strong></button></article>; })}{!filteredOrders.length && <div className="empty-state business-empty">{hasFilter ? <><b>没有匹配结果</b><p>{`“${orderSearch || monthLabel(orderMonth)}”下暂无订单，试试更换月份或关键词。`}</p></> : <><span>＋</span><b>还没有订单</b><p>记录第一笔订单，开始算清这笔生意的收入、成本和利润。</p><button onClick={openNewOrder}>＋ 记录第一笔订单</button></>}</div>}</div><section className="after-sale-status ledger-surface"><div><b>售后处理</b><span>{periodRefunds.length ? "全部售后" : "本期无退款"}</span></div>{!periodRefunds.length && <p>✓</p>}{periodRefunds.length > 0 && <ChevronRight size={18} />}</section>{refundPareto.length >= 2 && <section className="order-refund-chart ledger-surface"><div className="section-title"><div><span>售后原因</span><h2>退款占比</h2></div></div><RefundPareto items={refundPareto} onSelect={(reason) => { setOrderStatusFilter("refund"); setOrderSearch(reason); setOrderSearchOpen(true); }} /></section>}<button className="fixed-primary list-primary" onClick={openNewOrder}><Plus size={18} />记录订单</button></div>;
  }

  function OrderFormPage() {
    if (!skus.length) return <><section className="sub-intro compact"><span>{template.label} · 订单入账</span><h1>记录订单</h1><p>请先建商品成本卡。订单需要关联 SKU，才会冻结成交时的直接已售成本。</p></section><section className="order-prerequisite"><span>记录订单前的准备</span><b>请先建商品成本卡</b><em>新建商品成本卡并填写售价后，系统会自动创建可下单 SKU；随后返回此页记录成交、佣金与履约费用。</em><button onClick={openNewCard}><Plus size={17} />新建商品成本卡</button></section></>;
    const channelPricing = channelTemplates[orderChannel];
    return <><section className="sub-intro compact"><span>{template.label} · 订单入账</span><h1>记录订单</h1><p>订单会冻结当前渠道佣金、履约费用和目标贡献毛利率，后续修改模板不会重写历史订单。</p></section><form key="order-entry-form" className="record-form" onSubmit={saveOrder}><label>订单号（可选）<input name="orderNo" placeholder="例如：PDD-20260714-001" /></label><label>销售渠道<select value={orderChannel} onChange={(event) => setOrderChannel(event.target.value as OrderChannel)}><option value="platform">平台店</option><option value="live">直播</option><option value="store">到店</option><option value="private">私域</option><option value="other">其他</option></select></label><section className="channel-template-preview"><span><Calculator size={16} />{channelLabel[orderChannel]}默认费用模板</span><b>佣金 {channelPricing.commissionRatePct}% · 履约 ¥{channelPricing.fulfillmentCost} / 件 · 目标贡献毛利 {channelPricing.targetContributionMarginPct}%</b><em>可在成本卡的智能定价页修改并保存此渠道模板。</em></section><label>客户 / 收件人<input name="buyer" placeholder="例如：张女士 / 散客" /></label><label>成交日期<input name="date" type="date" defaultValue={editingIndirectPool?.occurredAt || today} /></label><section className="detail-breakdown"><h2>SKU 明细</h2><div className="bom-list">{draftOrderLines.map((line, index) => { const sku = skus.find((item) => item.id === line.skuId); return <div key={`${line.skuId}-${index}`}><span><select value={line.skuId} onChange={(event) => setDraftOrderLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, skuId: event.target.value } : item))}>{skus.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select><em>{sku ? `${yuan(sku.unitPriceFen / 100)} / ${sku.unit} · 成本 ${yuan(sku.unitCostFen / 100)}` : "请选择 SKU"}</em></span><input aria-label="数量" type="number" min="1" step="1" value={line.quantity ?? ""} onChange={(event) => setDraftOrderLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: toEditableNumber(event.target.value) } : item))} placeholder="数量" /><button type="button" onClick={() => setDraftOrderLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="删除 SKU 明细"><Trash2 size={15} /></button></div>; })}</div><button type="button" onClick={() => setDraftOrderLines((current) => [...current, { skuId: skus[0]?.id || "", quantity: 1 }])}><Plus size={16} />添加 SKU</button></section><button type="submit" className="fixed-primary form-save"><Plus size={18} />确认订单并入账</button></form></>;
  }

  function OrderDetailPage() {
    if (!activeOrder) return <div className="empty-state detail-empty-state"><b>订单不存在</b><p>该订单可能已被删除，或不属于当前行业。</p><button type="button" className="empty-action" onClick={() => goSub("orders")}>回到订单列表</button></div>;
    const refundsForOrder = refunds.filter((refund) => refund.orderId === activeOrder.id);
    const afterSales = getOrderAfterSalesMetrics(activeOrder, refundsForOrder);
    const warning = orderWarnings.find((item) => item.orderId === activeOrder.id);
    const pricing = activeOrder.pricing;
    return <><section className="detail-hero"><span>{activeOrder.orderNo} · {activeOrder.status === "paid" ? "已支付" : activeOrder.status === "partially_refunded" ? "部分退款" : "已退款"}</span><h1>{activeOrder.buyer || "散客"}</h1><strong>{yuan(fromFen(afterSales.netRevenueFen))}</strong><p>{afterSales.hasAfterSale ? `退款后净收入 · 成交 ${yuan(fromFen(afterSales.grossSalesFen))} − 退款 ${yuan(fromFen(afterSales.refundFen))}` : `${activeOrder.occurredAt} · 暂无退款`}</p></section><section className="order-after-sales-card"><div className="order-after-sales-head"><span>售后后经营口径</span><small>{afterSales.hasAfterSale ? "含实际退款、回收与手续费" : "当前无退款，按成交口径"}</small></div><div className="order-after-sales-kpis"><div><span>净收入</span><b>{yuan(fromFen(afterSales.netRevenueFen))}</b></div><div><span>经营成本</span><b>{yuan(fromFen(afterSales.operatingCostFen))}</b></div><div className={afterSales.operatingContributionFen < 0 ? "negative" : ""}><span>经营贡献</span><b>{yuan(fromFen(afterSales.operatingContributionFen))}</b></div></div><div className="order-after-sales-rows"><span><em>成交收入</em><b>{yuan(fromFen(afterSales.grossSalesFen))}</b></span>{afterSales.refundFen > 0 && <span><em>退款冲减</em><b>−{yuan(fromFen(afterSales.refundFen))}</b></span>}<span><em>最终商品成本（已扣回收）</em><b>{yuan(fromFen(afterSales.netCogsFen))}</b></span>{afterSales.refundFeeFen > 0 && <span><em>退款手续费</em><b>{yuan(fromFen(afterSales.refundFeeFen))}</b></span>}<span><em>预估渠道扣点</em><b>{yuan(fromFen(afterSales.estimatedCommissionFen))}</b></span><span><em>履约费用</em><b>{yuan(fromFen(afterSales.fulfillmentFen))}</b></span></div><p>经营成本＝最终商品成本＋实际退款手续费＋预估渠道扣点＋履约费用。渠道扣点与履约费用使用下单时的费用快照估算。</p></section><section className={warning ? "order-profit-alert danger" : "order-profit-alert"}><span><Calculator size={18} /></span><div><b>{warning ? (warning.type === "below_break_even" ? "低于保本价预警" : "低于目标毛利预警") : "订单利润核对"}</b><em>{warning ? (warning.type === "below_break_even" ? `退款后净收入 ${yuan(warning.revenue)}，保本线 ${yuan(warning.breakEvenRevenue)}；扣除费用后预计亏损 ${yuan(Math.abs(warning.contribution))}。` : `退款后贡献率 ${warning.contributionMarginRate}%，低于渠道目标 ${warning.targetMarginRate}%；预估扣点 ${yuan(warning.commission)}、履约 ${yuan(warning.fulfillment)}。`) : `渠道 ${channelLabel[activeOrder.channel]} · 佣金 ${pricing.commissionRatePct}% · 履约 ¥${pricing.fulfillmentCost}/件 · 目标贡献毛利 ${pricing.targetContributionMarginPct}%`}</em></div></section><section className="detail-breakdown"><h2>SKU 成交明细</h2><div className="bom-list">{activeOrder.lines.map((line) => <div key={line.id}><span><b>{line.skuName}</b><em>{line.skuCode} · {line.quantity}{line.unit} · 已退 {line.refundedQuantity}{line.unit}</em></span><strong>{yuan(line.unitPriceFen * line.quantity / 100)}</strong><button onClick={() => { setOrderLineId(line.id); setSubPage("refundForm"); }} disabled={line.refundedQuantity >= line.quantity} aria-label="登记该SKU退款"><ReceiptText size={15} /></button></div>)}</div></section><section className="detail-breakdown"><h2>退款与退货回收</h2>{!refundsForOrder.length && <div className="empty-state">暂无退款记录。</div>}<div className="report-breakdown">{refundsForOrder.map((refund) => <span key={refund.id}><b>{refundReasonLabel(refund.reason)}</b><em>{yuan(fromFen(refund.refundFen))} · 手续费 {yuan(fromFen(refund.refundFeeFen))} · {recoveryStatusLabel[refund.recoveryStatus]}{refund.recoveredCostFen > 0 ? ` ${yuan(fromFen(refund.recoveredCostFen))}` : ""}</em></span>)}</div></section></>;
  }

  function RefundFormPage() {
    if (!activeOrder || !activeOrderLine) return <div className="empty-state">请先从订单明细选择要退款的 SKU。</div>;
    const available = activeOrderLine.quantity - activeOrderLine.refundedQuantity;
    return <><section className="sub-intro compact"><span>{activeOrder.orderNo} · {activeOrderLine.skuName}</span><h1>登记退款</h1><p>退款冲减净营收；仅可售回收入库会冲回已售成本，破损报废不冲回。</p></section><form className="record-form" onSubmit={saveRefund}><label>退款数量<input name="quantity" type="number" min="1" max={available} step="1" defaultValue={available} /></label><label>退款金额<div className="amount-input"><span>¥</span><input name="refundAmount" type="number" min="0.01" max={(activeOrderLine.unitPriceFen / 100 * available).toFixed(2)} step="0.01" defaultValue={(activeOrderLine.unitPriceFen / 100 * available).toFixed(2)} /></div></label><label>退款手续费（可选）<div className="amount-input"><span>¥</span><input name="refundFee" type="number" min="0" step="0.01" defaultValue="0" /></div></label><label>退款原因<select name="reason"><option value="quality_issue">质量问题</option><option value="wrong_item">错发漏发</option><option value="customer_cancelled">客户取消</option><option value="logistics_delay">物流延误</option><option value="duplicate_order">重复下单</option><option value="other">其他</option></select></label><label>退货回收状态<select name="recoveryStatus"><option value="not_returned">无需退货</option><option value="in_transit">退货在途</option><option value="sellable_restocked">可售回收入库（冲回成本）</option><option value="damaged_disposed">破损报废（不冲回成本）</option></select></label><label>退款日期<input name="date" type="date" min={activeOrder.occurredAt} defaultValue={today < activeOrder.occurredAt ? activeOrder.occurredAt : today} /></label><button type="submit" className="fixed-primary form-save"><ReceiptText size={18} />确认退款</button></form></>;
  }

  function SkusPage() {
    return <><section className="sub-intro compact"><span>{template.label} · {cardCopy.title}</span><h1>SKU {cardCopy.title}</h1><p>单位成本来自成本卡；订单销售、退款与可售回收会形成每个 SKU 的真实毛利。调整成本只影响之后创建的订单。</p></section><div className="cost-card-list">{skuMetrics.map((sku) => <div key={sku.id}><span className="healthy"><PackageOpen size={19} /></span><div><b>{sku.name}</b><em>{sku.code} · 售 {sku.soldQuantity}{sku.unit} · 退 {sku.refundedQuantity}{sku.unit}</em><em>净营收 {yuan(sku.netRevenue)} · 已售成本 {yuan(sku.cogs)}</em><form onSubmit={(event) => saveSkuCost(event, sku.id)} className="sku-cost-form"><label>单位成本 ¥<input name="unitCost" type="number" min="0" step="0.01" defaultValue={(sku.unitCostFen / 100).toFixed(2)} /></label><button type="submit">更新</button></form></div><strong>{sku.grossMarginRate}%<small>真实毛利</small></strong></div>)}{!skuMetrics.length && <div className="empty-state">当前行业没有 SKU。请先维护成本卡。</div>}</div></>;
  }

  function RecordsPage() {
    const selectedRecordCategory = categoryByKey.get(recordCategoryFilter);
    const selectedRecordSku = skus.find((sku) => sku.id === recordSkuFilter);
    const hasFilter = recordMonth !== "all" || recordFilter !== "all" || Boolean(recordSearch.trim()) || recordChannelFilter !== "all" || Boolean(recordSupplierFilter) || Boolean(recordCategoryFilter) || Boolean(recordSkuFilter);
    const drillLabels = [recordCategoryFilter ? selectedRecordCategory?.label || "已选分类" : "", recordSkuFilter ? selectedRecordSku?.name || "已选商品" : "", recordChannelFilter !== "all" ? channelLabel[recordChannelFilter] : "", recordSupplierFilter ? suppliers.find((supplier) => supplier.id === recordSupplierFilter)?.name || "" : ""].filter(Boolean);
    const clearRecordFilters = () => { setRecordFilter("all"); setRecordMonth("all"); setRecordSearch(""); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(""); };
    return <>
      <section className="record-page-heading"><h1>收入、成本，逐笔算清</h1></section>
      <div className="record-filter"><button className={recordFilter === "all" ? "active" : ""} aria-pressed={recordFilter === "all"} onClick={() => setRecordFilter("all")}>全部</button><button className={recordFilter === "expense" ? "active" : ""} aria-pressed={recordFilter === "expense"} onClick={() => setRecordFilter("expense")}>成本 −</button><button className={recordFilter === "income" ? "active" : ""} aria-pressed={recordFilter === "income"} onClick={() => setRecordFilter("income")}>收入 ＋</button><button className={recordFilter === "refund" ? "active" : ""} aria-pressed={recordFilter === "refund"} onClick={() => setRecordFilter("refund")}>退款</button><label className="month-filter"><CalendarDays size={14} /><select aria-label="筛选流水月份" value={recordMonth} onChange={(event) => setRecordMonth(event.target.value)}><option value="all">全部月份</option>{recordMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div>
      {drillLabels.length > 0 && <div className="cashflow-drill-context"><span>数据下钻：{drillLabels.join(" · ")}</span><button onClick={() => { setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(""); }}>清除</button></div>}
      <label className="search-field"><Search size={16} /><input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="搜索商户、备注或分类" /></label>
      <div className="result-summary">{hasFilter ? `已找到 ${filteredRecords.length} 笔流水` : `共 ${records.length} 笔流水`}</div>
      {filteredRecords.length > 0 && <section className="record-export-panel" aria-label="导出当前筛选账单">
        <div><span>当前筛选</span><strong>{filteredRecords.length} 笔流水</strong><em>导出内容与列表一致</em></div>
        <div className="record-export-actions"><button type="button" onClick={() => exportFilteredRecords("csv")} disabled={!filteredRecords.length}><Download size={15} />CSV</button><button type="button" onClick={() => exportFilteredRecords("xlsx")} disabled={!filteredRecords.length}><Download size={15} />Excel</button></div>
      </section>}
      <section className="record-list">{groupedRecords.length === 0 && <div className="empty-state record-empty-state">{hasFilter ? <><b>没有匹配的流水</b><p>试试更换月份、类型或关键词。</p><button type="button" onClick={clearRecordFilters}>清除筛选</button></> : <><b>当前还没有流水</b><p>从一笔收入或成本开始记录。</p></>}</div>}{groupedRecords.map((group) => <div key={group.date} className="record-group"><h3>{book.dateLabel(group.date)}<span><Highlight value={group.date.replaceAll("-", " / ")} query={recordSearch} /></span></h3>{group.records.map((record) => { const category = categoryByKey.get(record.categoryKey); const isIncome = record.type === "income"; return <button className="record-row" key={record.id} onClick={() => openRecordDetail(record.id)}><span className="record-icon" style={{ color: category?.color, background: `${category?.color || "#087FF5"}18` }}><ReceiptText size={18} /></span><span><b><Highlight value={record.merchant} query={recordSearch} /></b><em><Highlight value={category?.label || "未分类"} query={recordSearch} /> · <Highlight value={record.note || "无备注"} query={recordSearch} />{record.hasAttachment ? " · 有凭证" : ""}</em></span><strong className={isIncome ? "income" : ""}>{isIncome ? "+" : "−"}{yuan(record.amount)}</strong><ChevronRight size={16} /></button>; })}</div>)}</section>
      <button className="floating-add" onClick={openNewRecord} aria-label="新增记一笔"><Plus size={22} aria-hidden="true" />记一笔</button>
    </>;
  }

  function AnalysisPageContent() {
    const period = analysisPeriod === "current" ? currentPeriod : book.previousPeriod(currentPeriod);
    const periodView = book.getPeriodView(period);
    const periodCost = periodView.totals.totalCost;
    const periodCategories = periodView.totals.categoryTotals;
    const previousView = book.getPeriodView(book.previousPeriod(period));
    const analysisRevenue = periodView.totals.revenue;
    const analysisCogs = analysisRevenue - periodView.totals.grossProfit;
    const analysisExpenses = periodView.totals.grossProfit - periodView.totals.operatingProfit;
    const hasRevenue = analysisRevenue > 0;
    const hasOperatingData = analysisRevenue !== 0 || periodCost !== 0;
    const categoryDeltas = buildCategoryDeltas(periodCategories, previousView.totals.categoryTotals);
    const costSummary = buildCostAnalysisSummary(categoryDeltas);
    const periodHiddenCosts = buildHiddenCostEstimates({ rules: template.hiddenCost, revenue: analysisRevenue, categoryAmounts: periodCategories });
    const visibleHiddenCosts = periodHiddenCosts.filter((item) => item.base > 0);
    const hiddenCostEstimateTotal = visibleHiddenCosts.reduce((sum, item) => sum + item.estimate, 0);
    const categoryDeltaByKey = new Map(categoryDeltas.map((item) => [item.key, item]));
    const refundPareto = buildRefundPareto(refunds.filter((refund) => refund.occurredAt.slice(0, 7) === period));
    const maxTrend = Math.max(...trend.map((item) => Math.max(item.cost, item.revenue)), 1);
    const sparseTrend = trend.filter((item) => item.cost > 0 || item.revenue > 0).length < 3;
    const months = trend.map((item) => item.month);
    const categoryLabels = Object.fromEntries(categories.map((category) => [category.key, category.label]));
    const monthlyCostStack = buildMonthlyCostStack({ entries: book.state.entries, industryId: book.activeIndustryId, categoryKeys: categories.map((category) => category.key), categoryLabels, periods: months });
    const cashDirectionEntries = book.state.entries.filter((entry) => entry.industryId === book.activeIndustryId && entry.status === "posted" && entry.cashDirection !== "none");
    const ordersById = new Map(orders.map((order) => [order.id, order]));
    const cashChannelOptions = Array.from(new Set(cashDirectionEntries.flatMap((entry) => { const channel = entry.orderId ? ordersById.get(entry.orderId)?.channel : undefined; return channel ? [channel] : []; })));
    const cashSupplierOptions = suppliers.filter((supplier) => cashDirectionEntries.some((entry) => entry.supplierId === supplier.id));
    const matchesCashFilters = (entry: typeof cashDirectionEntries[number]) => (cashChannelFilter === "all" || (entry.orderId ? ordersById.get(entry.orderId)?.channel === cashChannelFilter : false)) && (!cashSupplierFilter || entry.supplierId === cashSupplierFilter);
    const monthlyCashFlow = buildMonthlyCashFlow({ entries: book.state.entries, industryId: book.activeIndustryId, periods: months, entryFilter: matchesCashFilters });
    const cashForPeriod = buildMonthlyCashFlow({ entries: book.state.entries, industryId: book.activeIndustryId, periods: [period] }).months[0];
    const periodLedgerMetrics = buildMetrics(entriesForPeriod(book.state.entries, book.activeIndustryId, period), book.state.workspace.budgets[book.activeIndustryId]);
    const targetFen = book.salesTargetArchives.find((archive) => archive.period === period)?.targetFen ?? (period === currentPeriod ? Math.round(salesTarget * 100) : 0);
    const periodOrders = orders.filter((order) => order.occurredAt.startsWith(period));
    const periodOrderIds = new Set(periodOrders.map((order) => order.id));
    const periodSkuProfit = buildSkuRankings(buildPeriodSkuMetrics({ skus, orders, refunds, period })).profit;
    const maxSkuProfit = Math.max(...periodSkuProfit.map((item) => Math.abs(item.grossProfit)), 1);
    const health = buildBusinessHealth({ revenue: analysisRevenue, grossSales: periodLedgerMetrics.grossSalesFen / 100, refunds: periodLedgerMetrics.refundsFen / 100, operatingMarginRate: periodView.totals.operatingMarginRate, totalCost: periodCost, budget: totals.budget, dayOfMonth: analysisPeriod === "current" ? currentDay : daysInCurrentPeriod, daysInMonth: daysInCurrentPeriod, salesTargetFen: targetFen, targetOperatingMarginPct: healthSettings.targetOperatingMarginPct, refundTolerancePct: healthSettings.refundTolerancePct, cashInflow: cashForPeriod.inflow, cashOutflow: cashForPeriod.outflow, orderCount: periodOrders.length, lowProfitOrderCount: orderWarnings.filter((warning) => periodOrderIds.has(warning.orderId)).length, costEntryCount: book.state.entries.filter((entry) => entry.industryId === book.activeIndustryId && entry.status === "posted" && entry.occurredAt.startsWith(period) && (entry.ledgerRole === "cogs" || entry.ledgerRole === "opex")).length });
    const openMonthRecords = (month: string) => { setRecordFilter("all"); setRecordSearch(""); setRecordMonth(month); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(""); goSub("records"); };
    const openCostRecords = (categoryKey?: string) => { setRecordFilter("expense"); setRecordSearch(""); setRecordMonth(period); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(categoryKey || ""); setRecordSkuFilter(""); goSub("records"); };
    const openProfitComponent = (key: "revenue" | "cogs" | "expenses" | "profit") => { if (key === "revenue") { setRecordFilter("income"); setRecordSearch(""); setRecordMonth(period); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(""); goSub("records"); return; } if (key === "cogs" || key === "expenses") { openCostRecords(); return; } openMonthRecords(period); };
    const openSkuProfitRecords = (skuId: string) => { setRecordFilter("all"); setRecordSearch(""); setRecordMonth(period); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(""); setRecordSkuFilter(skuId); goSub("records"); };
    const openHealthDimension = (key: typeof health.dimensions[number]["key"]) => { if (key === "sales") goSub("salesTargets"); else if (key === "profit") goSub("healthSettings"); else if (key === "cost") goSub("budget"); else if (key === "cash") openMonthRecords(period); else { setOrderMonth(period); openOrdersContext("low_profit"); } };
    const openCategoryRecords = (key: string, _label: string) => openCostRecords(key);
    const priority = costSummary.priority;
    const priorityTitle = priority ? priority.reason === "increase" ? `${priority.label}是主要增量来源` : `${priority.label}占正向成本最多` : "尚未形成可诊断的成本分类";
    const priorityDetail = priority ? priority.reason === "increase" && priority.deltaRate !== null ? `较上期增加 ${yuan(priority.delta)} · 占正向成本 ${priority.share}%` : `占正向成本 ${priority.share}%` : "补录成本后生成诊断结论";
    const riskSummary = !hasRevenue ? "尚未录入收入，利润判断待生成" : priority?.reason === "increase" && priority.deltaRate !== null ? `${priority.label}较上期增加 ${yuan(priority.delta)}` : costSummary.deltaRate === null ? "已有成本，暂无上期基线" : costSummary.delta > 0 ? `净成本较上期增加 ${yuan(costSummary.delta)}` : "查看利润、趋势与潜在漏损";
    const diagnosisPeriodLabel = analysisPeriod === "current" ? "本月" : "上月";
    const diagnosisChangeLabel = costSummary.deltaRate === null ? "暂无上期基线" : costSummary.delta === 0 ? "较上期持平" : `${costSummary.delta > 0 ? "较上期增加" : "较上期减少"} ${yuan(Math.abs(costSummary.delta))} · ${Math.abs(costSummary.deltaRate)}%`;
    const diagnosisChangeTone = costSummary.delta > 0 ? "up" : costSummary.delta < 0 ? "down" : "flat";
    const analysisProfit = periodView.totals.operatingProfit;
    const analysisProfitMargin = analysisRevenue > 0 ? periodView.totals.operatingMarginRate : null;
    return <div className="prototype-analysis ledger-page-shell analysis-diagnosis-page analysis-profit-page" data-chart-role={chartRole("analysis").primary}>
      <section className="prototype-analysis-title ledger-page-heading"><div><h1>经营洞察 · {period.replace("-", " 年 ")} 月</h1><p>实时查看利润、成本与经营风险。</p></div><div className="segment-control" aria-label="洞察期间"><button className={analysisPeriod === "current" ? "active" : ""} onClick={() => setAnalysisPeriod("current")}>本月</button><button className={analysisPeriod === "last" ? "active" : ""} onClick={() => setAnalysisPeriod("last")}>上月</button></div></section>
      <section className="analysis-profit-overview ledger-surface"><div className="analysis-card-head"><div><h2>经营利润</h2><span>{diagnosisPeriodLabel}已入账结果</span></div><ChartTooltip label="经营利润" value={analysisProfit < 0 ? `−${yuan(Math.abs(analysisProfit))}` : yuan(analysisProfit)} detail="净营收减去销售成本和经营费用；退款按退款日冲减净营收。" /></div>{hasOperatingData ? <><div className={`analysis-profit-total ${analysisProfit < 0 ? "is-loss" : ""}`}><span>{analysisProfit < 0 ? "本期经营亏损" : "本期经营利润"}</span><strong>{analysisProfit < 0 ? "−" : ""}{yuan(Math.abs(analysisProfit))}</strong><em>{analysisProfitMargin === null ? "暂无净营收，利润率待生成" : `经营利润率 ${analysisProfitMargin}%`}</em></div><div className="analysis-profit-kpis"><span><em>净营收</em><b>{yuan(analysisRevenue)}</b></span><span><em>销售成本</em><b>{yuan(analysisCogs)}</b></span><span><em>经营费用</em><b>{yuan(analysisExpenses)}</b></span></div></> : <button className="analysis-no-revenue" onClick={openNewRecord}><span>本期尚未录入经营数据</span><b>先记录商品销售或成本</b><ChevronRight size={16} /></button>}</section>
      <section className="analysis-waterfall-card ledger-surface"><div className="analysis-card-head"><div><h2>利润构成</h2><span>从净营收到经营结果</span></div></div>{hasOperatingData ? <ProfitWaterfall revenue={analysisRevenue} cogs={analysisCogs} expenses={analysisExpenses} profit={analysisProfit} onSelect={openProfitComponent} /> : <HomeChartEmpty title="利润构成待生成" copy="记录商品销售后，将自动归集销售收入与已售成本。" action="记录商品销售" onClick={openNewOrder} />}</section>
      <ProfitTrend items={trend} events={profitTrendEvents} onOpen={openMonthRecords} />
      <section className="analysis-profit-sku ledger-surface" data-chart-template="rank"><div className="analysis-card-head"><div><h2>商品毛利排行</h2><span>按本期 SKU 净收入与已售成本汇总</span></div><b>Top {periodSkuProfit.length || 0}</b></div>{periodSkuProfit.length ? <div className="analysis-profit-sku-list">{periodSkuProfit.map((item, index) => <button key={item.id} type="button" onClick={() => openSkuProfitRecords(item.id)}><i>{index + 1}</i><span><b>{item.name}</b><em>{item.netQuantity}{item.unit} · 净营收 {yuan(item.netRevenue)}</em><i className="analysis-profit-sku-track" aria-hidden="true"><em className={item.grossProfit < 0 ? "is-loss" : ""} style={{ width: `${Math.max(7, Math.abs(item.grossProfit) / maxSkuProfit * 100)}%` }} /></i></span><strong className={item.grossProfit < 0 ? "is-loss" : ""}>{item.grossProfit < 0 ? "−" : ""}{yuan(Math.abs(item.grossProfit))}</strong><ChevronRight size={15} /></button>)}</div> : <HomeChartEmpty title="暂无可分析商品毛利" copy="记录带 SKU 的商品销售后自动生成" action="记录商品销售" onClick={openNewOrder} />}</section>
      <section className="analysis-cost-overview analysis-diagnosis-overview ledger-surface"><div className="analysis-card-head"><div><h2>成本诊断</h2><span>已入账净成本</span></div><span>{costSummary.totalCost > 0 ? diagnosisChangeLabel : "待录入"}</span></div>{costSummary.totalCost > 0 ? <><div className="analysis-cost-total"><span>已入账净成本</span><strong>{yuan(costSummary.totalCost)}</strong><em className={diagnosisChangeTone}>{diagnosisChangeLabel}</em>{costSummary.costCredits > 0 && <small className="analysis-cost-credit-note">正向成本 {yuan(costSummary.grossCost)} − 成本回冲 {yuan(costSummary.costCredits)} = 净成本 {yuan(costSummary.totalCost)}</small>}</div>{priority && <button className="analysis-diagnosis-action" onClick={() => openCategoryRecords(priority!.key, priority!.label)}><span><em>优先核对</em><b>{priorityTitle}</b><small>{priorityDetail}</small></span><strong>{yuan(priority!.amount)}</strong><ChevronRight size={17} /></button>}</> : <button className="analysis-no-revenue" onClick={openNewRecord}><span>本期尚未录入成本</span><b>补录成本后生成成本诊断</b><ChevronRight size={16} /></button>}</section>
      <CostAnalysisPieChart items={costSummary.structure} grossCost={costSummary.grossCost} onSelect={openCategoryRecords} onOpenAll={() => openCostRecords()} />
      <section className="analysis-more analysis-risk-review ledger-surface"><button className="analysis-more-trigger" type="button" aria-expanded={analysisDetailsOpen} onClick={() => setAnalysisDetailsOpen((value) => !value)}><span><b>行业参考估算</b><em>{visibleHiddenCosts.length ? `参考 ${template.label}可能漏损，不计入利润` : riskSummary}</em></span><ChevronDown size={18} /></button>{analysisDetailsOpen && <div className="analysis-more-content"><section className="analysis-hidden-cost-card"><div className="analysis-hidden-cost-head"><div><span>未入账参考估算</span><h2>{template.label}潜在漏损</h2></div><strong title={yuan(hiddenCostEstimateTotal)}>{formatMoneyCompact(hiddenCostEstimateTotal)}<small>未入账 · 不计入利润</small></strong></div>{visibleHiddenCosts.length ? <><div className="analysis-hidden-cost-list">{visibleHiddenCosts.slice(0, 3).map((item) => <div key={item.key}><span><b>{item.label}</b><em>{`${yuan(item.base)} 基数 × ${(item.rate * 100).toFixed(item.rate * 100 < 10 ? 1 : 0)}%`}</em></span><strong>{yuan(item.estimate)}</strong><small>{item.tip}</small></div>)}</div><div className="analysis-hidden-cost-foot"><span>仅作复核，不计入正式利润。</span><button onClick={() => openMonthRecords(period)}>核对流水 <ChevronRight size={15} /></button></div></> : <button className="analysis-hidden-cost-empty" onClick={openNewRecord}><span>暂无可估算基数</span><b>补录收入后自动生成</b><ChevronRight size={16} /></button>}</section></div>}</section>
      <AnalysisControlHub progress={salesTargetProgress} reports={reports} onOpenTargets={() => goSub("salesTargets")} onOpenIndirectCosts={() => goSub("indirectCosts")} onOpenReport={openReport} onOpenAllReports={() => goSub("reports")} />
      <section className="analysis-target-management" aria-label="本月销售目标"><SalesTargetProgress progress={salesTargetProgress} runRateForecast={salesRunRateForecast} editing={targetEditOpen} input={salesTargetInput} onInputChange={setSalesTargetInput} onEdit={openSalesTargetEditor} onSave={saveSalesTarget} onCancel={() => setTargetEditOpen(false)} onOpenOrders={() => openOrdersContext("all")} /></section>
    </div>;

  }

  function AnalysisPage() {
    const period = analysisPeriod === "current" ? currentPeriod : book.previousPeriod(currentPeriod);
    const periodView = book.getPeriodView(period);
    const previousView = book.getPeriodView(book.previousPeriod(period));
    const structureComparison = buildCostStructureComparison(periodView.totals.categoryTotals, previousView.totals.categoryTotals, 100);
    const supplierRankings = buildSupplierCostRankings({ entries: book.state.entries, suppliers, industryId: book.activeIndustryId, period }); const supplierRankMax = Math.max(1, ...supplierRankings.map((item) => item.amount));
    const openSupplierRecords = (supplierId: string) => { setRecordFilter("expense"); setRecordMonth(period); setRecordSearch(""); setRecordChannelFilter("all"); setRecordSupplierFilter(supplierId); setRecordCategoryFilter(""); setRecordSkuFilter(""); goSub("records"); };
    const openStructureRecords = (key: string, _label: string) => { setRecordFilter("expense"); setRecordMonth(period); setRecordSearch(""); setRecordChannelFilter("all"); setRecordSupplierFilter(""); setRecordCategoryFilter(key); setRecordSkuFilter(""); goSub("records"); };
    return <><AnalysisPageContent /><section className="analysis-supplement ledger-page-shell analysis-diagnosis-supplement" aria-label="成本变化与供应商归属"><section className="analysis-structure-compare ledger-surface" data-chart-template="grouped-bars"><div className="analysis-card-head"><div><h2>成本结构变化</h2><span>正向成本占比</span></div><div className="analysis-grouped-legend" aria-label="图例"><span><i className="current" />本期</span><span><i className="previous" />上期</span></div></div><StructureComparisonGroupedBars key={period} items={structureComparison} onSelect={openStructureRecords} /></section><section className="analysis-supplier-rank ledger-surface" data-chart-template="rank"><div className="analysis-card-head"><h2>成本归属 · 供应商</h2><span>已关联支出</span></div>{supplierRankings.length ? <div className="analysis-supplier-list template-supplier-lollipop">{supplierRankings.map((item, index) => <button key={item.supplierId} onClick={() => openSupplierRecords(item.supplierId)}><i>{index + 1}</i><span><b>{item.label}</b><em>{item.entryCount} 笔已入账支出 · 占已关联成本 {item.share}%</em><i className="supplier-lollipop" aria-hidden="true"><em style={{ width: `${item.amount / supplierRankMax * 100}%` }} /></i></span><strong>{yuan(item.amount)}</strong><ChevronRight size={15} /></button>)}</div> : <button className="analysis-supplier-empty" onClick={() => { setRecordType("expense"); openNewRecord(); }}><span><b>尚未关联供应商支出</b><em>在成本记录里关联供应商，才能核对成本归属。</em></span><ChevronRight size={16} /></button>}</section></section></>;
    return <><AnalysisPageContent /><section className="analysis-supplement ledger-page-shell" aria-label="成本对照与供应商排行"><section className="analysis-structure-compare ledger-surface" data-chart-template="structure-dumbbell"><div className="analysis-card-head"><h2>本期 / 上期结构</h2><span>正向成本占比</span></div>{structureComparison.length ? <div className="analysis-compare-list template-structure-dumbbell">{structureComparison.map((item) => <button key={item.key} onClick={() => { setRecordSearch(item.label); setRecordMonth(period); goSub("records"); }}><span><b>{item.label}</b><em>本期 {item.share}% · 上期 {item.previousShare}%</em><i className="structure-dumbbell" aria-hidden="true"><b style={{ width: `${item.share}%` }} /><em style={{ left: `${item.previousShare}%` }} /></i></span><strong className={item.shareDelta > 0 ? "up" : item.shareDelta < 0 ? "down" : "flat"}>{item.shareDelta > 0 ? "+" : ""}{item.shareDelta}pt</strong><ChevronRight size={15} /></button>)}</div> : <div className="analysis-empty-copy">本期与上期均暂无可对照的正向成本。</div>}</section><section className="analysis-supplier-rank ledger-surface" data-chart-template="rank"><div className="analysis-card-head"><h2>供应商成本排行</h2><span>已关联支出</span></div>{supplierRankings.length ? <div className="analysis-supplier-list template-supplier-lollipop">{supplierRankings.map((item, index) => <button key={item.supplierId} onClick={() => openSupplierRecords(item.supplierId)}><i>{index + 1}</i><span><b>{item.label}</b><em>{item.entryCount} 笔已入账支出 · 占已关联成本 {item.share}%</em><i className="supplier-lollipop" aria-hidden="true"><em style={{ width: `${item.amount / supplierRankMax * 100}%` }} /></i></span><strong>{yuan(item.amount)}</strong><ChevronRight size={15} /></button>)}</div> : <button className="analysis-supplier-empty" onClick={() => { setRecordType("expense"); openNewRecord(); }}><span><b>暂无已关联供应商成本</b><em>记录支出时关联供应商，即可在此查看排行。</em></span><ChevronRight size={16} /></button>}</section></section></>;
  }

  function IndirectCostsPage() {
    const categoryForKind = (kind: IndirectCostKind) => {
      const preferred = kind === "stall_fee" ? ["stall_fee", "rent_utilities", "other"] : kind === "rent" || kind === "utilities" ? ["rent_utilities", "other"] : kind === "base_labor" ? ["labor", "technician_labor", "other"] : kind === "depreciation" ? ["depreciation", "other"] : ["other"];
      return preferred.find((key) => categories.some((category) => category.key === key)) || categories[0]?.key || "other";
    };
    const saveIndirectPool = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const kind = String(data.get("kind") || "custom") as IndirectCostKind;
      const allocationMode = String(data.get("allocationMode") || "unallocated") as IndirectCostAllocationMode;
      const allocationMethod = String(data.get("allocationMethod") || "equal") as IndirectCostAllocationMethod;
      const targetIds = cards.filter((card) => data.get(`target-${card.id}`) === "on").map((card) => card.id);
      const targets = targetIds.map((cardId) => ({ cardId, manualWeight: Number(data.get(`weight-${cardId}`) || 0) }));
      const payload = { name: String(data.get("name") || indirectCostKindLabel[kind]), kind, amount: Number(data.get("amount") || 0), date: String(data.get("date") || today), categoryKey: String(data.get("categoryKey") || categoryForKind(kind)), source: String(data.get("source") || "actual") as IndirectCostSource, allocationMode, allocationMethod, targets };
      const result = editingIndirectPool ? book.updateIndirectCostPool(editingIndirectPool.id, payload) : book.addIndirectCostPool(payload);
      if (!result.ok) return notify(result.reason);
      notify(editingIndirectPool ? "成本池已更新；项目完全成本和定价已重新计算" : allocationMode === "allocated" ? "成本已入账；项目完全成本和定价已更新，不重复扣减订单利润" : "成本已入账，当前不影响项目完全成本");
      event.currentTarget.reset();
      setIndirectCostEditId(null);
      setIndirectAllocationMode("allocated");
      setIndirectAllocationMethod("units");
    };
    const allocatedTotal = indirectCostPools.filter((pool) => pool.allocationMode === "allocated").reduce((sum, pool) => sum + pool.amountFen / 100, 0);
    const unallocatedTotal = indirectCostPools.filter((pool) => pool.allocationMode === "unallocated").reduce((sum, pool) => sum + pool.amountFen / 100, 0);
    return <div className="indirect-cost-page ledger-page-shell"><section className="sub-intro compact"><span>{template.label} · 项目完全成本</span><h1>间接费用项</h1><p>把房租、水电、摊位费等录为间接费用项，再决定是否分到商品或服务项目。行业漏损估算仍只作风险提醒，不会混入这里。</p></section><section className="indirect-cost-summary ledger-surface"><div><em>本月已分摊</em><b>{yuan(allocatedTotal)}</b><small>{indirectCostPools.filter((pool) => pool.allocationMode === "allocated").length} 笔间接费用项</small></div><div><em>暂不分摊</em><b>{yuan(unallocatedTotal)}</b><small>仍会计入实际经营费用</small></div></section>{cards.length === 0 ? <section className="indirect-cost-empty ledger-surface"><b>先建立要承担费用的商品成本卡</b><p>新增商品成本卡后，才能把间接费用项分配到商品或服务项目。</p><button onClick={openNewCard}><Plus size={16} />新建商品成本卡</button></section> : <form key={editingIndirectPool?.id || "new"} className="indirect-cost-form ledger-surface secondary-form" onSubmit={saveIndirectPool}><div className="analysis-card-head"><h2>{editingIndirectPool ? "编辑间接费用项" : "新增间接费用项"}</h2>{editingIndirectPool ? <button type="button" onClick={() => { setIndirectCostEditId(null); setIndirectAllocationMode("allocated"); setIndirectAllocationMethod("units"); }}>取消编辑</button> : <span>保存后可随时切换是否摊销</span>}</div><div className="form-two-col"><label>费用类型<select name="kind" defaultValue={editingIndirectPool?.kind || "rent"} onChange={(event) => { const select = event.currentTarget.form?.elements.namedItem("categoryKey") as HTMLSelectElement | null; if (select) select.value = categoryForKind(event.target.value as IndirectCostKind); }}><option value="rent">房租</option><option value="utilities">水电物业</option><option value="stall_fee">摊位费</option><option value="base_labor">基础人工</option><option value="depreciation">设备折旧</option><option value="custom">其他间接费用</option></select></label><label>本期金额<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={editingIndirectPool ? (editingIndirectPool.amountFen / 100).toFixed(2) : ""} placeholder="例如：1800" required /></div></label><label>发生日期<input name="date" type="date" defaultValue={today} /></label><label>计入分类<select name="categoryKey" defaultValue={editingIndirectPool?.categoryKey || categoryForKind("rent")}>{categories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label></div><label>备注名称<input name="name" defaultValue={editingIndirectPool?.name || ""} placeholder="例如：8 月门店房租" /></label><section className="indirect-source-choice"><span>这笔钱是否已经发生？</span><div><label><input type="radio" name="source" value="actual" defaultChecked={!editingIndirectPool || editingIndirectPool.source === "actual"} />已发生，保存为经营费用</label><label><input type="radio" name="source" value="planned" defaultChecked={editingIndirectPool?.source === "planned"} />计划费用，仅作成本测算</label></div></section><section className="allocation-switch"><div><span><b>一键摊销到商品成本卡</b><em>把这笔费用纳入项目完全成本与后续定价。</em></span><div className="allocation-mode-options"><label className={indirectAllocationMode === "allocated" ? "selected" : ""}><input type="radio" name="allocationMode" value="allocated" checked={indirectAllocationMode === "allocated"} onChange={() => setIndirectAllocationMode("allocated")} />一键摊销</label><label className={indirectAllocationMode === "unallocated" ? "selected" : ""}><input type="radio" name="allocationMode" value="unallocated" checked={indirectAllocationMode === "unallocated"} onChange={() => setIndirectAllocationMode("unallocated")} />暂不摊销</label></div></div>{indirectAllocationMode === "allocated" && <><div className="allocation-rule"><span>怎么分给商品成本卡？</span><select name="allocationMethod" value={indirectAllocationMethod} onChange={(event) => setIndirectAllocationMethod(event.target.value as IndirectCostAllocationMethod)}>{(Object.keys(indirectCostAllocationMethodLabel) as IndirectCostAllocationMethod[]).map((method) => <option value={method} key={method}>{indirectCostAllocationMethodLabel[method]}</option>)}</select></div><p className="allocation-rule-note">{indirectAllocationMethod === "units" ? "卖得更多的项目多承担；本期没有销量时不会自动猜测分配。" : indirectAllocationMethod === "revenue" ? "营收更高的项目多承担；适合房租、门店基础费用。" : indirectAllocationMethod === "equal" ? "勾选的项目平均承担；适合项目价值相近的情况。" : "请为勾选项目填写比例，合计必须为 100%。"}</p><div className="allocation-targets">{cards.map((card) => <label key={card.id}><input type="checkbox" name={`target-${card.id}`} defaultChecked={!editingIndirectPool || editingIndirectPool.targets.some((target) => target.cardId === card.id)} /> <span><b>{card.name}</b><em>{card.kind || template.entityLabel}</em></span>{indirectAllocationMethod === "manual" && <span className="allocation-weight"><input name={`weight-${card.id}`} type="number" min="0" max="100" step="0.1" defaultValue={editingIndirectPool?.targets.find((target) => target.cardId === card.id)?.manualWeight ?? (100 / Math.max(cards.length, 1)).toFixed(1)} /><i>%</i></span>}</label>)}</div></>}</section><div className="form-actions"><button className="fixed-primary form-save" type="submit"><Check size={18} />{indirectAllocationMode === "allocated" ? "保存并一键摊销" : "保存为暂不摊销费用"}</button></div></form>}<section className="indirect-cost-list ledger-surface"><div className="analysis-card-head"><h2>本月间接费用项</h2><span>{indirectCostPools.length} 笔</span></div>{indirectCostPools.map((pool) => { const allocations = indirectCostAllocations.filter((item) => item.poolId === pool.id); return <article key={pool.id}><div><span><b>{pool.name}</b><em>{indirectCostKindLabel[pool.kind]} · {pool.source === "actual" ? "已入账" : "计划"} · {pool.allocationMode === "allocated" ? indirectCostAllocationMethodLabel[pool.allocationMethod] : "暂不摊销"}</em></span><strong>{yuan(pool.amountFen / 100)}</strong></div>{pool.allocationMode === "allocated" ? <p>已分给 {allocations.length} 个商品成本卡{allocations.length ? ` · ${allocations.map((item) => cards.find((card) => card.id === item.cardId)?.name || "项目").join("、")}` : "；本期缺少所需销量或营收基数，等待数据后自动计算"}</p> : <p>已保留为经营费用，尚未增加任何商品成本卡的单位成本。</p>}<footer><button onClick={() => { setIndirectCostEditId(pool.id); setIndirectAllocationMode(pool.allocationMode); setIndirectAllocationMethod(pool.allocationMethod); window.scrollTo({ top: 0, behavior: "smooth" }); }}>编辑</button><button onClick={() => { book.setIndirectCostAllocationMode(pool.id, pool.allocationMode === "allocated" ? "unallocated" : "allocated"); notify(pool.allocationMode === "allocated" ? "已停止商品成本卡摊销，原始经营费用保持不变" : "已重新启用商品成本卡摊销；将按原规则计算"); }}>{pool.allocationMode === "allocated" ? "暂不摊销" : "一键摊销"}</button><button className="danger" onClick={() => { if (!window.confirm("确认删除这项间接费用设置？原始经营费用会保留在流水中。")) return; book.removeIndirectCostPool(pool.id); notify("已删除间接费用设置，原始费用未改动"); }}>删除设置</button></footer></article>; })}{!indirectCostPools.length && <div className="analysis-hidden-cost-empty"><span>还没有间接费用项</span><b>从房租、水电、摊位费或基础人工开始记录</b></div>}</section><section className="indirect-cost-boundary"><CircleAlert size={17} /><p><b>口径说明：</b>已发生费用会进入经营利润；“一键摊销”只把它同步显示到商品成本卡完全成本和后续定价，不重复扣减利润，也不会改写历史订单。</p></section></div>;
  }

  function ProfilePage() {
    const handleLogout = async () => { if (!window.confirm("确认退出当前账号？本机账本草稿不会被删除。")) return; try { await logout.mutateAsync(); } catch { notify("退出失败，请稍后重试"); } };
    return <><section className="profile-identity-card profile-account-summary"><div className="profile-identity-top"><BrandAvatar assetId={meQuery.data?.avatarAssetId} preset={meQuery.data?.avatarPreset} alt="个人头像" size="large" /><div><span>当前账号</span><h1>{meQuery.data?.name || "店铺经营者"}</h1><p>{meQuery.data?.email || "已登录工作区"} · {template.label}经营者</p></div><button onClick={() => goSub("profileSettings")} aria-label="编辑个人与店铺资料"><Pencil size={17} /></button></div><div className="profile-identity-meta"><span><Check size={14} />个人已验证</span><i /><span><Store size={14} />{currentWorkspace?.name || template.storeName}</span></div></section><section className="profile-group"><h2>店铺管理</h2><div className="profile-card"><button onClick={() => goSub("profileSettings")}><span><Settings2 size={19} />个人与店铺资料</span><strong>编辑<ChevronRight size={16} /></strong></button><button onClick={() => goSub("industry")}><span><Store size={19} />经营行业</span><strong>{template.label}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("budget")}><span><WalletCards size={19} />经营预算</span><strong>{yuan(totals.budget)}<ChevronRight size={16} /></strong></button></div></section><section className="profile-group"><h2>设置</h2><div className="profile-card"><button onClick={() => goSub("appearance")}><span><Sparkles size={19} />外观设置</span><strong>{visualSkinOptions.find((option) => option.id === book.visualSkin)?.label || "外观"}<ChevronRight size={16} /></strong></button></div></section><section className="profile-group profile-account-group"><h2>账户</h2><div className="profile-session"><span><em>当前账号</em><b>{meQuery.data?.email || "已登录工作区"}</b></span><button onClick={handleLogout} disabled={logout.isPending}><LogOut size={17} />{logout.isPending ? "正在退出…" : "退出登录"}</button></div></section></>;
  }

  function AppearanceSettingsPage() {
    const selectedSkin = visualSkinOptions.find((option) => option.id === book.visualSkin);
    return <div className="appearance-settings-page"><section className="sub-intro compact"><span>我的 · 设置</span><h1>外观设置</h1><p>选择阅读与图表的显示风格；切换仅影响本机界面，不会改变账本、订单或经营数据。</p></section><section className="appearance-current-state"><span><Sparkles size={18} /><b>当前工作台</b></span><strong>{selectedSkin?.label || "默认外观"}</strong></section><VisualSkinPicker skin={book.visualSkin} onChange={(skin) => { book.updateVisualSkin(skin); setToast(`已切换为${visualSkinOptions.find((option) => option.id === skin)?.label || "新皮肤"}`); }} /></div>;
  }

  function AvatarStylePage() {
    const me = meQuery.data;
    if (!me) return <div className="empty-state">正在读取个人身份资料…</div>;
    const savePreset = async (preset: AvatarPresetId) => { try { await updateMe.mutateAsync({ name: me.name, avatarAssetId: me.avatarAssetId || null, avatarPreset: preset }); await utils.auth.me.refetch(); notify("个人预设头像已保存"); } catch (error) { notify(error instanceof Error ? error.message : "个人头像保存失败"); } };
    const uploadAvatar = async (file: File | undefined) => { if (!file) return; try { const asset = await uploadMedia(file, "user_avatar", me.id); await updateMe.mutateAsync({ name: me.name, avatarAssetId: asset.id, avatarPreset: me.avatarPreset as AvatarPresetId | null }); await utils.auth.me.refetch(); notify("真实头像已上传，将优先展示"); } catch (error) { notify(error instanceof Error ? error.message : "头像上传失败"); } };
    const source = me.avatarAssetId ? "真实上传头像正在优先展示" : `正在使用预设头像 · ${avatarPresets.find(item => item.id === me.avatarPreset)?.label || "默认头像"}`;
    return <><section className="sub-intro compact"><span>个人身份</span><h1>管理个人头像</h1><p>仅用于“我的”身份卡和个人资料，不会改变店铺 Logo 或{template.entityLabel}图片。</p></section><section className="identity-editor-card"><BrandAvatar assetId={me.avatarAssetId} preset={me.avatarPreset} alt="当前个人头像" size="large" /><div><b>{me.name || "店铺经营者"}</b><em>{source}</em></div></section><section className="identity-choice-panel"><div><b>选择预设头像</b><em>选择后立即保存；上传真实头像后仍会优先展示真实头像。</em></div><div className="identity-choice-grid">{avatarPresets.map(({ id, label }) => <button key={id} className={(me.avatarPreset || "classic") === id ? "selected" : ""} onClick={() => savePreset(id)} disabled={updateMe.isPending}><BrandAvatar preset={id} alt={label} /><span>{label}</span></button>)}</div></section><label className="identity-upload"><span><Upload size={17} /><b>上传真实头像</b><em>JPEG、PNG 或 WebP，最大 5MB；上传后覆盖预设展示。</em></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadAvatar(event.target.files?.[0])} /></label></>;
  }

  function StoreBrandPage() {
    if (!currentWorkspace) return <div className="empty-state">正在读取店铺品牌资料…</div>;
    const savePreset = async (preset: StorePresetId) => { try { await updateWorkspace.mutateAsync({ workspaceId: currentWorkspace.id, name: currentWorkspace.name, industryId: currentWorkspace.industryId as IndustryId, contactName: currentWorkspace.contactName || meQuery.data?.name || "", logoAssetId: currentWorkspace.logoAssetId || null, logoPreset: preset }); await utils.workspace.list.refetch(); notify("店铺预设图标已保存"); } catch (error) { notify(error instanceof Error ? error.message : "店铺图标保存失败"); } };
    const uploadLogo = async (file: File | undefined) => { if (!file) return; try { const asset = await uploadMedia(file, "workspace_logo", currentWorkspace.id); await updateWorkspace.mutateAsync({ workspaceId: currentWorkspace.id, name: currentWorkspace.name, industryId: currentWorkspace.industryId as IndustryId, contactName: currentWorkspace.contactName || meQuery.data?.name || "", logoAssetId: asset.id, logoPreset: currentWorkspace.logoPreset as StorePresetId | null }); await utils.workspace.list.refetch(); notify("店铺 Logo 已上传，将优先展示"); } catch (error) { notify(error instanceof Error ? error.message : "店铺 Logo 上传失败"); } };
    const source = currentWorkspace.logoAssetId ? "私有上传 Logo 正在优先展示" : currentWorkspace.logoPreset ? `正在使用预设图标 · ${storePresets.find(item => item.id === currentWorkspace.logoPreset)?.label || "通用店铺"}` : `正在使用${template.label}默认图标`;
    return <><section className="sub-intro compact"><span>店铺品牌</span><h1>管理店铺标识</h1><p>用于首页标题栏、店铺身份卡和店铺资料；不会改变个人头像或{template.entityLabel}图片。</p></section><section className="identity-editor-card"><BrandStoreLogo assetId={currentWorkspace.logoAssetId} preset={currentWorkspace.logoPreset} alt="当前店铺标识" size="normal" /><div><b>{currentWorkspace.name}</b><em>{source}</em></div></section><section className="identity-choice-panel"><div><b>选择预设店铺图标</b><em>选择后立即保存；上传私有 Logo 后仍会优先展示私有 Logo。</em></div><div className="identity-choice-grid store-choice-grid">{storePresets.map(({ id, label }) => <button key={id} className={(currentWorkspace.logoPreset || "store") === id ? "selected" : ""} onClick={() => savePreset(id)} disabled={updateWorkspace.isPending}><BrandStoreLogo preset={id} alt={label} /><span>{label}</span></button>)}</div></section><label className="identity-upload"><span><Upload size={17} /><b>上传私有店铺 Logo</b><em>JPEG、PNG 或 WebP，最大 5MB；上传后覆盖预设展示。</em></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadLogo(event.target.files?.[0])} /></label></>;
  }

  function IndustryPage() {
    return <><section className="sub-intro"><span>选择你的经营方式</span><h1>一套账本，<br />按行业展开。</h1><p>选择后会自动配置成本模型；历史流水、成本卡和月报仍保持原行业口径。</p></section><div className="industry-picker">{Object.values(industryTemplates).map((item) => { const Icon = iconByIndustry[item.id]; const chosen = item.id === selectedIndustry; return <button key={item.id} className={chosen ? "chosen" : ""} aria-pressed={chosen} onClick={() => setSelectedIndustry(item.id)}><span className="picker-icon"><Icon size={21} /></span><span><b>{item.label}</b><em>{item.descriptor}</em><small>{item.categories.slice(0, 4).map((category) => category.label).join(" ＋ ")} ＝ {item.label}成本模型</small></span>{chosen && <i>已选</i>}</button>; })}</div><div className="switch-note"><CircleAlert size={15} />切换后会创建目标行业分类；历史账本、成本卡和报告不会删除。</div><button className="fixed-primary" onClick={applyIndustry}>使用{industryTemplates[selectedIndustry].label}模板</button></>;
  }

  function RecordPage() {
    const editing = activeRecord;
    const hasImageVoucher = Boolean(attachmentAssetId);
    return <><section className="sub-intro compact"><span>{template.label} · 经营交易</span><h1>{editing ? "编辑一笔记录" : "记录一笔收支"}</h1><p>商品销售会同步订单、SKU 与已售成本；其他收入与手工退款保持独立归类。</p></section><form key="manual-record-form" ref={recordFormRef} className="record-form" onSubmit={saveRecord}><label>交易类型<div className="type-switch record-type-switch"><button type="button" className={recordType === "expense" ? "selected" : ""} onClick={() => changeRecordType("expense")}>支出</button><button type="button" className={recordType === "income" ? "selected" : ""} onClick={() => changeRecordType("income")}>其他收入</button><button type="button" className="record-product-sale" onClick={openNewOrder}><ShoppingCart size={14} />商品销售</button><button type="button" className={recordType === "refund" ? "selected" : ""} onClick={() => changeRecordType("refund")}>手工退款</button></div></label><label>{recordType === "refund" ? "退款金额" : "金额"}<div className="amount-input"><span>¥</span><input name="amount" ref={amountInputRef} type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" autoFocus /></div></label>{recordType === "refund" && <><label>退款手续费（可选）<div className="amount-input"><span>¥</span><input name="refundFee" type="number" min="0" step="0.01" defaultValue="0" /></div></label><label>退货可回收成本（可选）<div className="amount-input"><span>¥</span><input name="recovery" type="number" min="0" step="0.01" defaultValue="0" /></div></label></>}<label>日期<input name="date" type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} /></label><label>{recordCategoryTitle}<div className="category-chips">{recordCategoryOptions.map((item) => <button type="button" key={item.key} className={currentCategoryKey === item.key ? "selected" : ""} onClick={() => setSelectedCategoryKey(item.key)}>{item.label}</button>)}<button type="button" className="category-custom-trigger" onClick={() => setCustomRecordCategoryOpen((open) => !open)}><Plus size={13} />自定义</button></div>{customRecordCategoryOpen && <div className="record-custom-category"><input aria-label={`自定义${recordCategoryTitle}`} value={customRecordCategoryLabel} onChange={(event) => setCustomRecordCategoryLabel(event.target.value)} placeholder={`例如：${recordType === "income" ? "押金收入" : recordType === "refund" ? "活动退款" : "临时支出"}`} /><button type="button" onClick={addCustomRecordCategory}>添加</button></div>}<small>{recordType === "income" ? "其他收入不生成订单、SKU 销量、客单价或商品利润；商品销售请点击上方入口。" : recordType === "refund" ? "这是手工退款；已关联订单的售后请从订单详情登记，才会同步退货数量和回收状态。" : "支出标签会决定成本或费用归类。"}</small></label><section className="record-more"><button type="button" className="analysis-more-trigger record-more-trigger" aria-expanded={recordMoreOpen} onClick={() => setRecordMoreOpen((open) => !open)}><span><b>更多信息</b><em>{recordMoreOpen ? "收起供应商、备注与凭证" : recordType === "expense" ? "供应商、备注与凭证（可选）" : "备注与凭证（可选）"}</em></span><ChevronDown size={18} /></button>{recordMoreOpen && <div className="analysis-more-content record-more-content"><label>{recordMerchantLabel}<input name="merchant" value={formMerchant} onChange={(event) => setFormMerchant(event.target.value)} placeholder={recordMerchantPlaceholder} /></label>{recordType === "expense" && suppliers.length > 0 && <label>关联供应商（可选）<select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)}><option value="">未关联供应商</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><small>关联后可在现金流图按供应商筛选与下钻。</small></label>}<label>备注<input name="note" value={formNote} onChange={(event) => setFormNote(event.target.value)} placeholder={`例如：${recordCategoryOptions[0]?.hint || "本次交易"}`} /></label><fieldset className="record-voucher-field"><legend><Upload size={16} />凭证图片</legend>{hasImageVoucher ? <div className="record-voucher-attached"><img src={`/api/media/${attachmentAssetId}`} alt="已附凭证图片" /><span><b>已附私有图片凭证</b><small>仅当前店铺成员可查看；保存记录后关联生效。</small><button type="button" onClick={() => { setAttachmentAssetId(null); setHasAttachment(false); setVoucherUploadError(""); }}>移除图片</button></span></div> : <label className="record-voucher-picker"><input aria-label="上传凭证图片" type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploadingVoucher} onChange={(event) => void uploadRecordVoucher(event.currentTarget.files?.[0])} /><span>{isUploadingVoucher ? "正在上传凭证图片…" : "选择凭证图片"}</span><em>JPEG、PNG 或 WebP，最大 5MB</em></label>}{voucherUploadError && <small className="record-voucher-error" role="alert">{voucherUploadError}</small>}{!hasImageVoucher && <label className="record-voucher-legacy"><input type="checkbox" checked={hasAttachment} onChange={(event) => setHasAttachment(event.currentTarget.checked)} />此笔已有线下凭证（仅标记）</label>}</fieldset></div>}</section><div className="record-form-actions">{!editing && <button type="button" className="record-save-continue" onClick={saveRecordAndContinue} disabled={isUploadingVoucher}><Check size={16} />保存并继续</button>}<button type="submit" className="fixed-primary form-save" disabled={isUploadingVoucher}><Plus size={18} />{editing ? "保存修改" : "保存记录"}</button></div></form></>;
  }

  function RecordDetailPage() {
    if (!activeRecord) return <div className="empty-state detail-empty-state"><b>记录不存在</b><p>该笔流水可能已被删除，或当前行业不可见。</p><button type="button" className="empty-action" onClick={() => goSub("records")}>回到流水列表</button></div>;
    const category = categoryByKey.get(activeRecord.categoryKey);
    const hasImageVoucher = Boolean(activeRecord.attachmentAssetId);
    return <><section className="detail-hero"><span className="detail-dot" style={{ background: category?.color || "#1677FF" }} /><span>{activeRecord.type === "income" ? "收入记录" : activeRecord.type === "refund" ? "退款记录" : "支出记录"}</span><h1>{activeRecord.merchant}</h1><strong>{activeRecord.type === "income" ? "+" : "-"}{yuan(activeRecord.amount)}</strong><p>{activeRecord.date} · {category?.label || "未分类"} · {activeRecord.status === "accounted" ? "已核算" : activeRecord.status === "pending" ? "待核算" : "异常"}</p></section><section className="detail-breakdown"><h2>记录说明</h2><div><span className="tip-icon"><ReceiptText size={18} /></span><p>{activeRecord.note || "未填写备注"}{hasImageVoucher ? " · 已附图片凭证" : activeRecord.hasAttachment ? " · 已附凭证" : " · 未附凭证"}</p></div>{hasImageVoucher && <a className="record-voucher-preview" href={`/api/media/${activeRecord.attachmentAssetId}`} target="_blank" rel="noreferrer"><img src={`/api/media/${activeRecord.attachmentAssetId}`} alt={`${activeRecord.merchant}的凭证图片`} /><span>查看受保护凭证图片 <ChevronRight size={15} /></span></a>}<button onClick={editRecord}>编辑记录 <Pencil size={16} /></button><button className="danger-button" onClick={deleteRecord}>删除记录 <Trash2 size={16} /></button></section></>;
  }

  function CardsPage() {
    const visibleCards = cards.filter((card) => card.name.toLowerCase().includes(cardSearch.toLowerCase()) || card.kind.toLowerCase().includes(cardSearch.toLowerCase()));
    const watchCount = cards.filter((card) => card.status === "risk" || card.status === "attention").length;
    return <div className="prototype-products ledger-page-shell"><section className="products-page-title ledger-page-heading"><h1>{cardCopy.title}</h1></section><div className="product-tabs"><button className="active">全部{template.entityLabel} <span>{cards.length}</span></button><button>关注 <span>{watchCount}</span></button><button><ChevronDown size={15} />按成本上升</button></div><label className="search-field product-search"><Search size={16} /><input value={cardSearch} onChange={(event) => setCardSearch(event.target.value)} placeholder={`搜索${template.entityLabel}名称或类型`} /></label><div className="product-cost-list ledger-row-list">{visibleCards.map((card) => { const allocatedIndirectCost = (indirectCostUnitFenByCard[card.id] || 0) / 100; const directValue = calcCard(card); const value = { ...directValue, cost: Number((directValue.cost + allocatedIndirectCost).toFixed(2)) }; const unitProfit = card.salePrice - value.cost; return <button key={card.id} onClick={() => openCard(card.id)}><div className="product-card-head"><CostCardThumbnail assetId={card.imageAssetId} alt={card.name} /><div><b>{card.name}</b><em>{card.kind || template.entityLabel} · 单位：{card.unit}</em></div><i className={card.status === "risk" ? "risk" : card.status === "attention" ? "attention" : "healthy"}>{card.status === "risk" ? "需复核" : card.status === "attention" ? "成本上升" : "稳定"}</i></div><div className="product-kpis ledger-data-columns"><label><em>单位成本</em><b>{yuan(value.cost)}</b></label><label><em>售价</em><b>{card.salePrice > 0 ? yuan(card.salePrice) : "未填写"}</b></label><label><em>单件利润</em><b className={unitProfit < 0 ? "negative" : "positive"}>{card.salePrice > 0 ? yuan(unitProfit) : "—"}</b></label></div><div className="product-actions"><span><Boxes size={17} />成本构成 <b>{card.items.length}项</b><ChevronRight size={15} /></span><span><Calculator size={17} />智能定价 <ChevronRight size={15} /></span></div></button>; })}{!visibleCards.length && <div className="empty-state">没有匹配的成本卡。</div>}</div><button className="fixed-primary list-primary" onClick={openNewCard}><Plus size={18} />新增{template.entityLabel}成本卡</button></div>;
  }

  function CardDetailPage() {
    if (!activeCard || !cardCost) return <div className="empty-state detail-empty-state"><b>成本卡不存在</b><p>该成本卡可能已被删除或归档，无法继续查看。</p><button type="button" className="empty-action" onClick={() => goSub("cards")}>回到成本卡列表</button></div>;
    const max = Math.max(...activeCard.history, cardCost.cost, 1);
    const linkedSku = skuMetrics.find((sku) => sku.cardId === activeCard.id);
    const unitProfit = activeCard.salePrice - cardCost.cost;
    const currentSkuUnitCost = linkedSku ? linkedSku.unitCostFen / 100 : cardCost.cost;
    const latestCostSnapshot = linkedSku ? orders
      .flatMap((order) => order.lines.filter((line) => line.skuId === linkedSku.id).map((line) => ({ order, line })))
      .sort((left, right) => `${right.order.occurredAt}-${right.order.createdAt}`.localeCompare(`${left.order.occurredAt}-${left.order.createdAt}`))[0] : undefined;
    const uploadCardImage = async (file: File | undefined) => { if (!file) return; try { const asset = await uploadMedia(file, "cost_card_image", activeCard.id); const result = book.updateCard(activeCard.id, { imageAssetId: asset.id }); notify(result.ok ? `${template.entityLabel}图片已上传` : result.reason); } catch (error) { notify(error instanceof Error ? error.message : `${template.entityLabel}图片上传失败`); } };
    return <>
      <section className="sub-intro compact"><span>{template.entityLabel} · 成本核算</span><h1>{activeCard.name}</h1><p>{activeCard.kind} · 先看成本构成，再判断售价与利润是否合理。</p></section>
      <CostCardMediaEditor assetId={activeCard.imageAssetId} alt={activeCard.name} entityLabel={template.entityLabel} onUpload={uploadCardImage} />
      <section className="cost-formula"><span>成本构成</span><div><b>{template.formulaLabel} {yuan(cardCost.material)}</b><i>＋</i><b>人工 {yuan(activeCard.labor)}</b><i>＋</i><b>固定/项目分摊 {yuan(activeCard.overhead + activeCardIndirectCost)}</b><i>＝</i><strong>{yuan(cardCost.cost)} / {activeCard.unit}</strong></div></section>
      <section className="cost-snapshot-compare" aria-label="订单成本快照对比"><div><span>订单成本快照</span><em>只读</em></div><dl><div><dt>当前单位成本</dt><dd>{yuan(currentSkuUnitCost)} / {activeCard.unit}</dd></div><div><dt>最近成交冻结成本</dt><dd>{latestCostSnapshot ? `${yuan(latestCostSnapshot.line.unitCostFen / 100)} / ${latestCostSnapshot.line.unit}` : "暂无历史成交成本快照"}</dd></div></dl><p>{latestCostSnapshot ? `${latestCostSnapshot.order.occurredAt.replaceAll("-", "/")} 的订单已冻结当时单位成本；后续订单才使用当前成本。` : "尚无关联 SKU 的成交订单；后续订单才会冻结当前成本。"}</p></section>
      {activeCard.salePrice > 0 ? <EquationResult firstLabel="当前售价" firstValue={yuan(activeCard.salePrice)} secondLabel="单位成本" secondValue={yuan(cardCost.cost)} resultLabel={cardCopy.unitProfitLabel} resultValue={yuan(unitProfit)} detail={`毛利率 ${cardCost.marginRate}% · ${unitProfit >= 0 ? "当前售价可覆盖单位成本" : "当前售价低于单位成本，请优先调整"}`} /> : <button className="pricing-empty-tip" onClick={openPricing}><Calculator size={18} /><span><b>尚未填写售价，毛利率无法计算</b><em>使用智能测算定价，先设定目标毛利再一键写入。</em></span><ChevronRight size={16} /></button>}
      <section className="detail-actions"><button className="primary" onClick={editCard}><Pencil size={16} />编辑成本</button><button onClick={openPricing}><Calculator size={16} />测算定价</button><button type="button" className="more-trigger" aria-expanded={cardMoreOpen} aria-controls="card-more-actions" onClick={() => setCardMoreOpen((open) => !open)}><MoreHorizontal size={16} />更多</button>{cardMoreOpen && <div className="detail-more-menu" id="card-more-actions"><button type="button" className="danger" onClick={requestDeleteCard}><Trash2 size={16} />删除成本卡</button></div>}</section>
      {linkedSku && <section className="detail-breakdown"><h2>订单 SKU 实绩</h2><div><span className="tip-icon"><ShoppingCart size={18} /></span><p>售出 {linkedSku.soldQuantity}{linkedSku.unit}，退款 {linkedSku.refundedQuantity}{linkedSku.unit}，净营收 {yuan(linkedSku.netRevenue)}，真实毛利率 {linkedSku.grossMarginRate}% 。</p></div><button onClick={() => goSub("skus")}>查看 SKU 经营 <ChevronRight size={16} /></button></section>}
      <section className="detail-breakdown"><h2>{template.formulaLabel}明细</h2><div className="bom-list">{activeCard.items.map((item) => <div key={item.id}><span><b>{item.name}</b><em>{item.spec || "规格待补充"} · {item.quantity}</em></span><strong>{yuan(item.amount)}</strong><span className="bom-row-actions"><button onClick={() => { setBomItemId(item.id); goSub("bomForm"); }} aria-label="编辑成本项"><Pencil size={14} /></button><button onClick={() => { book.removeBomItem(activeCard.id, item.id); notify("已删除成本项，单位成本和 SKU 已同步重算"); }} aria-label="删除成本项"><Trash2 size={15} /></button></span></div>)}</div><button onClick={() => { setBomItemId(null); goSub("bomForm"); }}>＋ 添加{template.formulaLabel}项</button></section>
      <section className="detail-breakdown"><h2>近 6 月单位成本趋势</h2><div className="weekly-bars cost-history">{activeCard.history.map((amount, index) => <span key={`${amount}-${index}`}><i style={{ height: `${amount / max * 100}%`, background: index === activeCard.history.length - 1 ? "#087FF5" : "#cfe2ff" }} /><em>{index + 2} 月</em></span>)}</div></section>
    </>;
  }

  function PricingProfitTrendChart({ trend, breakEvenPrice, suggestedPrice }: { trend: ReturnType<typeof buildPricingProfitTrend>; breakEvenPrice: number; suggestedPrice: number }) {
    if (!trend.current || trend.points.length < 2) return null;
    const minPrice = trend.points[0].price;
    const maxPrice = trend.points.at(-1)!.price;
    const lowestContribution = Math.min(0, ...trend.points.map((point) => point.contribution));
    const highestContribution = Math.max(0, ...trend.points.map((point) => point.contribution));
    const contributionRange = Math.max(1, highestContribution - lowestContribution);
    const xAt = (price: number) => 4 + (price - minPrice) / Math.max(0.01, maxPrice - minPrice) * 92;
    const yAt = (contribution: number) => 56 - (contribution - lowestContribution) / contributionRange * 48;
    const polyline = buildSmoothPricingProfitPolyline(trend.points.map((point) => ({ x: xAt(point.price), y: yAt(point.contribution) })));
    const zeroLine = yAt(0);
    const areaPoints = `${polyline} 96,56 4,56`;
    const markerX = (price: number) => price >= minPrice && price <= maxPrice ? xAt(price) : null;
    const breakEvenX = markerX(breakEvenPrice);
    const suggestedX = markerX(suggestedPrice);
    const currentX = xAt(trend.current.price);
    const currentY = yAt(trend.current.contribution);
    const peak = Math.max(...trend.points.map((point) => point.contribution));
    const low = Math.min(...trend.points.map((point) => point.contribution));
    return <section className="pricing-profit-trend" aria-labelledby="pricing-profit-trend-title">
      <div className="pricing-profit-trend-head"><span><b id="pricing-profit-trend-title">预期利润</b><ChartTooltip label="当前试算" value={`${yuan(trend.current.price)} · ${yuan(trend.current.contribution)}`} detail={`拖动售价后按现有渠道费率、履约费与单位成本即时计算每${activeCard?.unit}贡献。`} /><em>每{activeCard?.unit}贡献</em></span><strong><AnimatedChartValue value={trend.current.contribution} format={yuan} /></strong></div>
      <figure>
        <svg viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label={`不同售价下的每${activeCard?.unit}预期贡献趋势；当前试算价 ${yuan(trend.current.price)}，每${activeCard?.unit}贡献 ${yuan(trend.current.contribution)}`}>
          <defs><linearGradient id="pricing-profit-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#9dddff" stopOpacity=".42" /><stop offset="100%" stopColor="#9dddff" stopOpacity="0" /></linearGradient></defs>
          <polygon className="pricing-profit-area" points={areaPoints} fill="url(#pricing-profit-area)" />
          <line className="pricing-profit-zero" x1="4" x2="96" y1={zeroLine} y2={zeroLine} />
          <polyline className="pricing-profit-line" points={polyline} />
          {breakEvenX !== null && <line className="pricing-profit-marker break-even" x1={breakEvenX} x2={breakEvenX} y1="7" y2="56" />}
          {suggestedX !== null && <line className="pricing-profit-marker suggested" x1={suggestedX} x2={suggestedX} y1="7" y2="56" />}
          {trend.points.map((point) => {
            const pointClass = point.isCurrent ? "current" : point.contribution === peak ? "peak" : point.contribution === low ? "low" : "";
            const label = point.isCurrent ? "当前" : point.contribution === peak ? "最高" : point.contribution === low ? "最低" : "价格点";
            return <circle key={point.price} className={`pricing-profit-point ${pointClass}`} cx={xAt(point.price)} cy={yAt(point.contribution)} r={point.isCurrent ? "3.2" : pointClass ? "2.35" : "1.15"} aria-label={`${label}：售价 ${yuan(point.price)}，贡献 ${yuan(point.contribution)}`}><title>{`${label} · ${yuan(point.price)} · 贡献 ${yuan(point.contribution)}`}</title></circle>;
          })}
          <circle className="pricing-profit-current-ring" cx={currentX} cy={currentY} r="5" />
        </svg>
        <figcaption><span>区间 {yuan(minPrice)}–{yuan(maxPrice)}</span><span>峰值 {yuan(peak)}</span></figcaption>
      </figure>
      <div className="pricing-keypoints" aria-label={`当前价 ${yuan(trend.current.price)}，保本价 ${yuan(breakEvenPrice)}，建议价 ${yuan(suggestedPrice)}`}><span><em>当前</em><b>{yuan(trend.current.price)}</b></span><span><em>保本</em><b>{yuan(breakEvenPrice)}</b></span><span><em>建议</em><b>{yuan(suggestedPrice)}</b></span></div>
      <div className="pricing-profit-tooltip" role="status"><i className="current" /><span>当前试算</span><b>{yuan(trend.current.price)} · 贡献 {yuan(trend.current.contribution)}</b></div>
      <div className="pricing-profit-legend"><span><i className="break-even" />保本 {yuan(breakEvenPrice)}</span><span><i className="suggested" />建议 {yuan(suggestedPrice)}</span></div>
    </section>;
  }

  function PricingPage() {
    if (!activeCard || !cardCost) return <div className="empty-state detail-empty-state"><b>请先选择一张成本卡</b><p>智能测算定价需要先打开一张成本卡，再开始试算。</p><button type="button" className="empty-action" onClick={() => goSub("cards")}>回到成本卡列表</button></div>;
    const pricingInputsReady = [pricingPlatformRate, pricingFulfillmentCost, pricingTargetMargin].every(isNonNegativeNumber);
    const base = { unitCost: cardCost.cost, platformRatePct: toNumber(pricingPlatformRate), fulfillmentCost: toNumber(pricingFulfillmentCost) };
    const targetMargin = toNumber(pricingTargetMargin);
    const breakEven = pricingInputsReady ? breakEvenPrice(base.unitCost, base.platformRatePct, base.fulfillmentCost) : null;
    const suggested = pricingInputsReady ? quotePrice({ ...base, targetContributionMarginPct: targetMargin }) : null;
    const plans = [30, 40, 50].map((target) => ({ target, quote: quotePrice({ ...base, targetContributionMarginPct: target }) }));
    const simulatePrice = (price: number) => { const contribution = Number((price * (1 - base.platformRatePct / 100) - cardCost.cost - base.fulfillmentCost).toFixed(2)); return { price, contribution, margin: price > 0 ? Number((contribution / price * 100).toFixed(1)) : 0 }; };
    const suggestedPrice = suggested?.available ? suggested.price : 0;
    const sliderRange = buildPriceSliderRange({ suggestedPrice, breakEvenPrice: breakEven?.available ? breakEven.price : null });
    const sliderMin = sliderRange.min;
    const sliderMax = sliderRange.max;
    const previewPrice = suggestedPrice > 0 ? clampSliderPrice(pricingPreviewPrice, sliderRange, suggestedPrice) : 0;
    const preview = suggested?.available ? simulatePrice(previewPrice) : null;
    const profitTrend = preview && suggested?.available ? buildPricingProfitTrend({ range: sliderRange, unitCost: base.unitCost, platformRatePct: base.platformRatePct, fulfillmentCost: base.fulfillmentCost, currentPrice: preview.price }) : null;
    const priceState = preview && breakEven?.available && previewPrice < breakEven.price ? { tone: "risk", copy: `低于保本价 ${yuan(breakEven.price)}` } : preview && preview.margin < targetMargin ? { tone: "attention", copy: `低于 ${targetMargin}% 目标贡献毛利` } : { tone: "healthy", copy: `达到 ${targetMargin}% 目标贡献毛利` };
    const switchPricingChannel = (channel: OrderChannel) => { const config = channelTemplates[channel]; setPricingChannel(channel); setPricingPlatformRate(config.commissionRatePct); setPricingFulfillmentCost(config.fulfillmentCost); setPricingTargetMargin(config.targetContributionMarginPct); setPricingPreviewPrice(null); };
    const promo = preview ? simulatePrice(Number((preview.price * (1 - promotionDiscount / 100)).toFixed(2))) : null;
    const competitorPrices = pricingInputsReady ? [competitorLow, competitorHigh].filter((value) => value > 0).sort((a, b) => a - b).map(simulatePrice) : [];
    const writePrice = (price: number) => { if (!Number.isFinite(price) || price <= 0) return; book.updateCard(activeCard.id, { salePrice: price }); notify(`建议售价 ${yuan(price)} 已写入成本卡，并同步后续订单 SKU`); replaceSubPage("cardDetail"); };
    return <>
      <section className="sub-intro compact"><span>{activeCard.name} · 智能定价</span><h1>先算保本，再定售价</h1><p>以单位完全成本为基数，扣除渠道费率与单件履约费用后，反推目标贡献毛利率所需售价。</p></section>
      <section className="pricing-base"><span>当前单位完全成本</span><strong>{yuan(cardCost.cost)} / {activeCard.unit}</strong><em>{template.formulaLabel} {yuan(cardCost.material)} + 人工 {yuan(activeCard.labor)} + 固定分摊 {yuan(activeCard.overhead)} + 项目分摊 {yuan(activeCardIndirectCost)}</em></section>
      <section className="record-form compact-form pricing-inputs">
        <label>销售渠道<select value={pricingChannel} onChange={(event) => switchPricingChannel(event.target.value as OrderChannel)}>{(Object.keys(channelTemplates) as OrderChannel[]).map((channel) => <option key={channel} value={channel}>{channelLabel[channel]}</option>)}</select></label>
        <div className="template-head"><span><Calculator size={15} />{channelLabel[pricingChannel]}费用模板</span><button type="button" onClick={() => { if (!pricingInputsReady) return notify("请补齐渠道费率、履约费用和目标毛利率"); const result = book.updateChannelPricing(pricingChannel, { commissionRatePct: base.platformRatePct, fulfillmentCost: base.fulfillmentCost, targetContributionMarginPct: targetMargin }); notify(result.ok ? `${channelLabel[pricingChannel]}默认费用模板已保存，新订单将自动使用` : result.reason); }}>保存模板</button></div>
        <label>渠道综合费率<input type="number" min="0" max="99" step="0.1" value={pricingPlatformRate} onChange={(event) => { setPricingPlatformRate(toEditableNumber(event.target.value)); setPricingPreviewPrice(null); }} placeholder="例如：5" /><small>按订单实收比例扣除；非平台渠道可填 0%</small></label>
        <label>单件履约费用<div className="amount-input"><span>¥</span><input type="number" min="0" step="0.01" value={pricingFulfillmentCost} onChange={(event) => { setPricingFulfillmentCost(toEditableNumber(event.target.value)); setPricingPreviewPrice(null); }} placeholder="例如：3.50" /></div><small>例如额外运费、支付手续费或单件售后准备金</small></label>
        <label>目标贡献毛利率<input type="number" min="0" max="99" step="1" value={pricingTargetMargin} onChange={(event) => { setPricingTargetMargin(toEditableNumber(event.target.value)); setPricingPreviewPrice(null); }} placeholder="例如：40" /></label>
      </section>
      <section className="pricing-quote"><span>保本售价</span><strong>{!pricingInputsReady ? "待填写" : breakEven?.available ? yuan(breakEven.price) : "无法计算"}</strong><em>{!pricingInputsReady ? "请补齐渠道费率、履约费用和目标毛利率" : breakEven?.available ? `扣除渠道费用后贡献毛利 ${breakEven.contributionMarginPct}%` : breakEven?.reason}</em></section>
      {suggested?.available && preview ? <section className="pricing-recommend"><span>{pricingPreviewPrice === null ? `建议售价 · 目标贡献毛利 ${targetMargin}%` : "当前试算价"}</span><strong>{yuan(preview.price)}</strong><p>{pricingPreviewPrice === null ? `直接保留两位小数；每${activeCard.unit}贡献 ${yuan(preview.contribution)}。` : `参考建议价 ${yuan(suggested.price)}；拖动后实时重算。`}</p><div className="price-slider-panel"><div><b>拖动试算售价</b><em>{priceState.copy}</em></div><input type="range" min={sliderMin} max={sliderMax} step="0.01" value={preview.price} aria-label="拖动试算售价" aria-valuetext={yuan(preview.price)} onChange={(event) => setPricingPreviewPrice(Number(Number(event.target.value).toFixed(2)))} /><div className="price-slider-scale"><span>保本 {yuan(breakEven?.price || 0)}</span><button type="button" onClick={() => setPricingPreviewPrice(null)}>回到建议价 {yuan(suggested.price)}</button><span>{yuan(sliderMax)}</span></div></div>{profitTrend && <PricingProfitTrendChart trend={profitTrend} breakEvenPrice={breakEven?.price || 0} suggestedPrice={suggested.price} />}<div className={`pricing-preview-result ${priceState.tone}`}><b>贡献毛利 {preview.margin}%</b><em>每{activeCard.unit}贡献 {yuan(preview.contribution)} · {priceState.copy}</em></div><button onClick={() => writePrice(preview.price)}><Calculator size={17} />写入当前试算价</button></section> : <div className="pricing-error"><CircleAlert size={18} />{pricingInputsReady ? suggested?.reason : "请补齐渠道费率、履约费用和目标毛利率"}</div>}
      <section className="detail-breakdown pricing-simulator"><h2>竞品与促销利润模拟</h2><div className="form-two-col"><label>竞品低价<input type="number" min="0" step="0.01" value={competitorLow || ""} onChange={(event) => setCompetitorLow(Number(event.target.value) || 0)} placeholder="例如：59" /></label><label>竞品高价<input type="number" min="0" step="0.01" value={competitorHigh || ""} onChange={(event) => setCompetitorHigh(Number(event.target.value) || 0)} placeholder="例如：79" /></label><label>促销折扣<input type="number" min="0" max="99" step="1" value={promotionDiscount || ""} onChange={(event) => setPromotionDiscount(Number(event.target.value) || 0)} placeholder="例如：10" /></label><label>促销后售价<input readOnly value={promo ? yuan(promo.price) : "—"} /></label></div>{promo && <div className={promo.contribution < 0 ? "sim-result danger" : promo.margin < targetMargin ? "sim-result warning" : "sim-result"}><b>促销后贡献毛利 {promo.margin}%</b><em>单件贡献 {yuan(promo.contribution)} {promo.contribution < 0 ? "· 低于保本价" : promo.margin < targetMargin ? `· 低于 ${targetMargin}% 目标` : "· 达到目标"}</em></div>}{competitorPrices.length > 0 && <div className="competitor-results">{competitorPrices.map((result) => <span key={result.price}><b>竞品价 {yuan(result.price)}</b><em>贡献毛利 {result.margin}% · 单件 {yuan(result.contribution)}</em></span>)}</div>}</section>
      <section className="detail-breakdown pricing-plans"><h2>常用目标售价</h2><div className="report-breakdown">{plans.map(({ target, quote }) => <button key={target} disabled={!pricingInputsReady || !quote.available} onClick={() => pricingInputsReady && quote.available && setPricingPreviewPrice(quote.price)}><span><b>{target}% 目标贡献毛利</b><em>{quote.available ? `点击带入 ${yuan(quote.price)}` : quote.reason}</em></span><strong>{quote.available ? yuan(quote.price) : "—"}</strong></button>)}</div></section>
      <section className="pricing-note"><CircleAlert size={16} /><p>该测算是定价辅助工具，不替代市场需求、促销折扣、税费或实际平台结算核对；价格写入仅影响后续订单，历史订单售价和成本快照不会改写。</p></section>
    </>;
  }

  function CardFormPage() {
    const editing = activeCard;
    const visibleMaterials = draftMaterials.length ? draftMaterials : [createDraftMaterial(template.unitLabel, { id: `placeholder-${template.id}`, name: "直接材料" })];
    const updateMaterial = (id: string, patch: Partial<Omit<DraftMaterial, "id">>) => setDraftMaterials((current) => updateDraftMaterial(current.length ? current : visibleMaterials, id, patch));
    return <><section className="sub-intro compact"><span>{template.label} · {template.entityLabel}定价</span><h1>{editing ? `编辑${template.entityLabel}` : `新增${template.entityLabel}`}</h1><p>可连续添加多项材料。保存后会自动创建或同步 SKU；更新只应用于之后创建的订单，历史订单保留成交快照。</p></section><form className="record-form secondary-form" onSubmit={saveCard} onChange={() => setCardFormDirty(true)}><label>{template.entityLabel}名称<input name="name" defaultValue={editing?.name || ""} placeholder={`例如：${template.entityLabel}名称`} autoFocus /></label><label>类型 / 标签<input name="kind" defaultValue={editing?.kind || ""} placeholder={`例如：${template.entityLabel}类型`} /></label><label>计量单位<input name="unit" defaultValue={editing?.unit || template.unitLabel} placeholder={`例如：${template.unitLabel}`} /></label><label>销售单价<div className="amount-input"><span>¥</span><input name="salePrice" type="number" min="0.01" step="0.01" defaultValue={editing?.salePrice || ""} placeholder="例如：68" /></div></label><section className="form-section material-editor"><span>基础材料清单</span><div className="material-list">{visibleMaterials.map((material, index) => <div className="material-row" key={material.id}><div className="material-row-head"><b>材料 {index + 1}</b>{visibleMaterials.length > 1 && <button type="button" onClick={() => setDraftMaterials((current) => removeDraftMaterial(current, material.id))}><Trash2 size={14} />删除</button>}</div><div className="form-two-col"><label>名称<input value={material.name} onChange={(event) => updateMaterial(material.id, { name: event.target.value })} placeholder="例如：包装盒" /></label><label>金额<input type="number" min="0.01" step="0.01" value={material.amount} onChange={(event) => updateMaterial(material.id, { amount: toEditableNumber(event.target.value) })} placeholder="0.00" /></label><label>规格<input value={material.spec} onChange={(event) => updateMaterial(material.id, { spec: event.target.value })} placeholder="例如：500g" /></label><label>数量<input value={material.quantity} onChange={(event) => updateMaterial(material.id, { quantity: event.target.value })} placeholder={`例如：1 ${template.unitLabel}`} /></label></div></div>)}</div><button className="add-material" type="button" onClick={() => setDraftMaterials((current) => [...(current.length ? current : visibleMaterials), createDraftMaterial(template.unitLabel)])}><Plus size={16} />新增材料</button></section><section className="form-section"><span>其他单位成本</span><div className="form-two-col"><label>人工分摊<input name="labor" type="number" min="0" step="0.01" defaultValue={editing?.labor ?? "0"} placeholder="0.00" /></label><label>固定分摊<input name="overhead" type="number" min="0" step="0.01" defaultValue={editing?.overhead ?? "0"} placeholder="0.00" /></label></div></section><div className="form-actions"><button className="form-secondary" type="button" onClick={goBack}>取消并返回</button><button className="fixed-primary form-save" type="submit"><Plus size={18} />{editing ? "保存成本卡" : `创建${template.entityLabel}成本卡与 SKU`}</button></div></form></>;
  }

  function BomFormPage() {
    return <><section className="sub-intro compact"><span>{activeCard?.name || template.entityLabel} · {template.formulaLabel}</span><h1>{activeBomItem ? "编辑成本项" : "添加成本项"}</h1><p>保存后会立刻重算单位成本、毛利率和后续订单使用的 SKU 成本。</p></section><form className="record-form secondary-form" onSubmit={saveBomItem}><label>成本项名称<input name="name" defaultValue={activeBomItem?.name || ""} placeholder="例如：包装盒 / 服务耗材" /></label><label>规格<input name="spec" defaultValue={activeBomItem?.spec || ""} placeholder="例如：500g / 单次" /></label><label>数量<input name="quantity" defaultValue={activeBomItem?.quantity || "1 份"} placeholder="例如：1 份" /></label><label>金额<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" defaultValue={activeBomItem?.amount ?? ""} placeholder="0.00" /></div></label><div className="form-actions"><button className="fixed-primary form-save" type="submit"><Plus size={18} />{activeBomItem ? "保存并重算" : "加入并重算"}</button></div></form></>;
  }

  function BudgetPage() {
    const budgetBurn = buildBudgetBurn({ budget: totals.budget, used: totals.totalCost, dayOfMonth: currentDay, daysInMonth: new Date(periodYear, periodMonth, 0).getDate() });
    const forecastLabel = budgetBurn.state === "over" ? `月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}` : budgetBurn.state === "risk" ? `月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}` : `月末预计结余 ${yuan(Math.max(0, budgetBurn.budget - budgetBurn.forecast))}`;
    return <div className="prototype-budget" data-chart-role={chartRole("budget").primary}><section className="prototype-budget-title"><h1>预算管理 · {currentPeriod.replace("-", " 年 ")} 月</h1></section><BudgetRing burn={budgetBurn} onClick={() => notify("已按当前入账成本刷新预算预测")} /><div className={budgetBurn.state === "healthy" ? "budget-alert normal" : "budget-alert"}><CircleAlert size={17} />{forecastLabel}</div><section className="budget-forecast"><div className="budget-forecast-head"><span>月末预计趋势</span><CircleAlert size={15} /></div><div className="budget-forecast-line"><i className="budget-line-spent" /><i className="budget-line-projection" /><small className="budget-line-target">预算线 {yuan(budgetBurn.budget)}</small><b className="budget-line-current">{yuan(budgetBurn.used)}</b><b className="budget-line-forecast">{yuan(budgetBurn.forecast)}</b></div><div className="budget-forecast-labels"><span>今天 {String(currentDay).padStart(2, "0")} 日</span><span>月末 {new Date(periodYear, periodMonth, 0).getDate()} 日</span></div></section><form className="budget-form-card secondary-form" noValidate onSubmit={saveBudget}><div><span>当前月度预算</span><b>{yuan(totals.budget)}</b><ChevronRight size={17} /></div><label className="budget-input"><span>调整为</span><div><i>¥</i><input name="budget" type="number" step="0.01" defaultValue={totals.budget} inputMode="decimal" aria-label="调整后的月度预算金额" aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? "budget-error" : undefined} onChange={() => setBudgetError("")} /></div></label>{budgetError && <p id="budget-error" className="field-error" role="alert">{budgetError}</p>}<div className="form-actions"><button type="submit" className="fixed-primary form-save">保存预算并刷新预测</button></div></form></div>;
  }

  function HealthSettingsPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 公开评分配置</span><h1>经营健康度阈值</h1><p>评分只使用已设置阈值与已入账数据。未设置或数据不足的维度会显示“待补数”，不会以零分或满分代替。</p></section><form className="record-form health-settings-form" onSubmit={saveHealthSettings}><label>目标经营利润率（%）<input name="targetOperatingMarginPct" type="number" min="0" max="100" step="0.1" defaultValue={healthSettings.targetOperatingMarginPct || ""} placeholder="例如：15" /><small>利润质量 ＝ 实际经营利润率 ÷ 此目标；填写 0 表示暂不评分。</small></label><label>退款容忍率（%）<input name="refundTolerancePct" type="number" min="0" max="100" step="0.1" defaultValue={healthSettings.refundTolerancePct || ""} placeholder="例如：5" /><small>售后质量以退款率为主、低利润订单占比为辅；填写 0 表示暂不评分。</small></label><section className="health-settings-note"><CircleAlert size={17} /><p><b>固定公开规则</b>销售进度按截至今日应达目标计算；成本控制按自然日预算进度计算；现金覆盖只读取现金方向分录。所有待补数维度不纳入平均分。</p></section><button type="submit" className="fixed-primary form-save"><Check size={18} />保存评分阈值</button></form></>;
  }

  function SalesTargetsPage() {
    const historyMonths = Array.from(new Set([...trend.map((item) => item.month), ...book.salesTargetArchives.map((item) => item.period), currentPeriod])).sort((a, b) => b.localeCompare(a));
    const revenueByPeriod = Object.fromEntries(historyMonths.map((month) => [month, book.getPeriodView(month).totals.revenue]));
    const history = buildSalesTargetHistory({ period: archivePeriod, archives: book.salesTargetArchives, revenueByPeriod });
    const archive = book.salesTargetArchives.find((item) => item.period === archivePeriod);
    const compareValue = (rate: number | null, label: string, hasBase: boolean) => rate === null ? <span className="comparison-missing">{hasBase ? "基数为 0，不计算" : `缺少${label}基数`}</span> : <b className={rate >= 0 ? "up" : "down"}>{rate >= 0 ? "↑" : "↓"}{Math.abs(rate)}%</b>;
    const saveArchive = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const target = Number(new FormData(event.currentTarget).get("target")); if (!target || target <= 0) return notify("请输入正确的月销售目标"); book.saveSalesTargetArchive(archivePeriod, target); notify(`${archivePeriod.replace("-", " 年 ")} 月销售目标已归档`); };
    return <div className="sales-target-history-page"><section className="sub-intro compact"><span>{template.label} · 月度归档</span><h1>销售目标历史</h1><p>按行业保存每月销售目标；完成率只按该月已入账净销售计算。上月或去年同月缺少目标、流水时不生成对比数。</p></section><section className="archive-period-picker"><label>查看月份<select value={archivePeriod} onChange={(event) => setArchivePeriod(event.target.value)}>{historyMonths.map((month) => <option key={month} value={month}>{month.replace("-", " 年 ")} 月</option>)}</select></label><span>{archive ? "已归档" : archivePeriod === currentPeriod && salesTarget > 0 ? "当前目标待归档" : "待归档"}</span></section><section className="archive-summary"><div><em>月销售目标</em><b>{history.target === null ? "待设置" : yuan(history.target)}</b></div><div><em>实际净销售</em><b>{history.revenue === null ? "待补录" : yuan(history.revenue)}</b></div><div><em>完成率</em><b>{history.completionRate === null ? "—" : `${history.completionRate}%`}</b></div></section><section className="archive-compare"><div><span>较上月</span><b>目标 {compareValue(history.mom.target, "上月目标", history.mom.hasTargetBase)}</b><b>净销售 {compareValue(history.mom.revenue, "上月净销售", history.mom.hasRevenueBase)}</b></div><div><span>较去年同月</span><b>目标 {compareValue(history.yoy.target, "去年同月目标", history.yoy.hasTargetBase)}</b><b>净销售 {compareValue(history.yoy.revenue, "去年同月净销售", history.yoy.hasRevenueBase)}</b></div></section><form className="archive-target-form" onSubmit={saveArchive}><div><span>{archivePeriod.replace("-", " 年 ")} 月目标</span><em>保存即覆盖该行业该月旧归档，不影响其他月份。</em></div><label><i>¥</i><input name="target" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={history.target ?? (archivePeriod === currentPeriod && salesTarget > 0 ? salesTarget : "")} placeholder="例如：300000" /></label><button type="submit">{archive ? "更新归档目标" : "归档本月目标"}</button></form><section className="archive-history-list"><div className="analysis-card-head"><h2>已归档月份</h2><span>{book.salesTargetArchives.length} 期</span></div>{book.salesTargetArchives.map((item) => <button key={item.id} onClick={() => setArchivePeriod(item.period)}><span><b>{item.period.replace("-", " 年 ")} 月</b><em>目标 {yuan(item.targetFen / 100)}</em></span><ChevronRight size={16} /></button>)}{!book.salesTargetArchives.length && <HomeChartEmpty title="尚未归档销售目标" copy="先为本月设置目标，保存后即可形成历史与对比基数" action="设置本月目标" onClick={() => { setArchivePeriod(currentPeriod); setTab("home"); setSubPage(null); setTargetEditOpen(true); }} />}</section></div>;
  }

  function ReportsPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 正式月度报表</span><h1>经营报表</h1><p>实时洞察用于当期经营判断；经营报表可按月封存，并保留当期行业与分类快照。</p></section><div className="report-list">{reports.map((report) => <button key={report.id} onClick={() => openReport(report.id)}><span><FileText size={20} /></span><div><b>{report.month.replace("-", " 年 ")} 月经营报表</b><em>{report.status === "closed" ? "已封存快照" : "实时草稿 · 可封存"} · 支出 {yuan(report.cost)} · 净营收 {yuan(report.revenue)}</em></div><strong>{report.grossMarginRate}%<small>毛利率</small></strong><ChevronRight size={16} /></button>)}</div></>;
  }

  function exportReportCsv(report: Report) {
    const csv = buildReportCsv({ report, industryLabel: template.label, storeName: template.storeName });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${template.storeName}-${report.month}-经营报表.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    notify("已导出月度经营报表 CSV");
  }

  async function exportFilteredRecords(format: BillExportFormat) {
    if (!filteredRecords.length) {
      notify("当前筛选没有可导出的流水");
      return;
    }
    const model = buildBillExportModel({
      records: filteredRecords,
      storeName: currentWorkspace?.name || template.storeName,
      industryLabel: template.label,
      filters: {
        month: recordMonth,
        type: recordFilter,
        query: recordSearch,
        channelLabel: recordChannelFilter === "all" ? "" : channelLabel[recordChannelFilter],
        supplierName: recordSupplierFilter ? suppliers.find((supplier) => supplier.id === recordSupplierFilter)?.name || "" : "",
      },
      categoryLabel: (categoryKey) => categoryByKey.get(categoryKey)?.label || "未分类",
      channelLabel: (record) => record.orderId ? channelLabel[orders.find((order) => order.id === record.orderId)?.channel || "other"] : "",
      supplierName: (supplierId) => supplierId ? suppliers.find((supplier) => supplier.id === supplierId)?.name || "" : "",
      orderNo: (orderId) => orderId ? orders.find((order) => order.id === orderId)?.orderNo || "" : "",
    });
    await downloadBillExport(model, format);
    notify(`已导出 ${filteredRecords.length} 笔经营流水（${format === "csv" ? "CSV" : "Excel"}）`);
  }

  function ReportDetailPage() {
    if (!activeReport) return <div className="empty-state">报表不存在。</div>;
    const reportOrders = orders.filter((order) => order.occurredAt.slice(0, 7) === activeReport.month);
    const reportRefunds = refunds.filter((refund) => refund.occurredAt.slice(0, 7) === activeReport.month);
    return <><section className="detail-hero"><span>{template.label} · {activeReport.status === "closed" ? "已封存快照" : "实时草稿"}</span><h1>{activeReport.month.replace("-", " 年 ")} 月报</h1><strong>{yuan(activeReport.cost)}</strong><p>净营收 {yuan(activeReport.revenue)} · 毛利 {yuan(activeReport.margin)} · 毛利率 {activeReport.grossMarginRate}% · 经营利润率 {activeReport.operatingMarginRate}%</p></section><section className="detail-breakdown"><h2>订单与退款</h2><div><span className="tip-icon"><ShoppingCart size={18} /></span><p>本期已纳入 {reportOrders.length} 笔订单、{reportRefunds.length} 笔 SKU 退款；订单销售和已售成本已并入收入与成本口径。</p></div><button onClick={() => goSub("orders")}>查看订单账本 <ChevronRight size={16} /></button></section><section className="detail-breakdown"><h2>分类明细</h2><div className="report-breakdown">{activeReport.snapshot.map((item) => <span key={item.key}><b>{item.label}</b><em>{yuan(item.amount)} · {item.pct}%</em></span>)}</div>{activeReport.status === "draft" ? <button onClick={() => { book.closeReport(activeReport.month); notify("月报已封存；之后的流水不会改写该快照"); }}>封存本月口径 <FileText size={16} /></button> : <button onClick={() => exportReportCsv(activeReport)}>导出 CSV <FileText size={16} /></button>}</section></>;
  }

  function deleteSupplier(id: string, name: string) {
    if (!window.confirm(`确认删除供应商“${name}”吗？历史流水不会删除。`)) return;
    book.removeSupplier(id);
    notify("供应商已删除，历史流水已保留");
  }
  function deleteCategory(id: string, label: string) {
    if (!window.confirm(`确认删除分类“${label}”吗？已关联的账本记录会保留原口径。`)) return;
    const result = book.removeCategory(id);
    notify(result.ok ? "分类已删除，历史记录已保留" : result.reason || "无法删除分类");
  }

  function SuppliersPage() {
    const { own: ownSuppliers, shared: sharedSuppliers } = groupSuppliers({ suppliers, query: supplierSearch, categoryLabels: new Map(Array.from(categoryByKey.entries()).map(([key, category]) => [key, category.label])) });
    const hasVisibleSuppliers = ownSuppliers.length + sharedSuppliers.length > 0;
    const supplierRow = (supplier: typeof suppliers[number]) => { const category = categoryByKey.get(supplier.categoryKey); return <div key={supplier.id}><span>{supplier.name.slice(0, 1)}</span><section><b>{supplier.name}</b><em>{category?.label || "未分类"} · {supplier.contact || "未设置联系人"}</em></section><strong>{yuan(supplier.spend)}<small>{supplier.orders} 笔</small></strong><button onClick={() => { setSupplierEditId(supplier.id); goSub("supplierForm"); }} aria-label={`编辑供应商 ${supplier.name}`}><Pencil size={15} /></button><button onClick={() => deleteSupplier(supplier.id, supplier.name)} aria-label={`删除供应商 ${supplier.name}`}><Trash2 size={16} /></button></div>; };
    return <>
      <section className="sub-intro compact"><span>{template.label} · 采购协同</span><h1>供应商</h1><p>供应商按行业范围关联；共享供应商可在多个行业账本中复用。</p></section>
      <label className="search-field supplier-search"><Search size={16} /><input value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} placeholder="搜索供应商、联系人或分类" /></label>
      <div className="supplier-list">{ownSuppliers.length > 0 && <><h2>当前行业</h2>{ownSuppliers.map(supplierRow)}</>}{sharedSuppliers.length > 0 && <><h2>共享供应商</h2>{sharedSuppliers.map(supplierRow)}</>}{!hasVisibleSuppliers && <div className="empty-state">没有匹配的供应商。</div>}</div>
      <button className="fixed-primary" onClick={() => { setSupplierEditId(null); goSub("supplierForm"); }}><Plus size={18} />新增供应商</button>
    </>;
  }

  function SupplierFormPage() {
    const editing = suppliers.find((supplier) => supplier.id === supplierEditId);
    return <><section className="sub-intro compact"><span>{template.label} · 供应商信息</span><h1>{editing ? "编辑供应商" : "新增供应商"}</h1><p>共享供应商可在其他行业账本中选用；已有历史流水不会被改写。</p></section><form className="record-form secondary-form" onSubmit={saveSupplier}><label>供应商名称<input name="name" defaultValue={editing?.name} placeholder="例如：优选食材供应" /></label><label>联系人<input name="contact" defaultValue={editing?.contact} placeholder="例如：李经理" /></label><label>默认分类<select name="categoryKey" defaultValue={editing?.categoryKey || categories[0]?.key}>{categories.map((category) => <option value={category.key} key={category.key}>{category.label}</option>)}</select></label><label className="attachment-row"><span>跨行业可用</span><input name="shared" type="checkbox" defaultChecked={editing?.industryIds.includes("shared")} /></label><div className="form-actions"><button type="submit" className="fixed-primary form-save"><Plus size={18} />{editing ? "保存供应商" : "新增供应商"}</button></div></form></>;
  }

  function CategoriesPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 账本口径</span><h1>分类管理</h1><p>分类会同步影响记账归集、成本构成、报表和隐性成本模型。</p></section><div className="category-manage-list">{categories.map((category) => <div key={category.id}><i style={{ background: category.color }} /><span><b>{category.label}</b><em>{category.hint}</em></span><button onClick={() => { setCategoryEditId(category.id); goSub("categoryForm"); }} aria-label={`编辑分类 ${category.label}`}><Pencil size={15} /></button><button onClick={() => deleteCategory(category.id, category.label)} aria-label={`删除分类 ${category.label}`}><Trash2 size={16} /></button></div>)}</div><button className="fixed-primary" onClick={() => { setCategoryEditId(null); goSub("categoryForm"); }}><Plus size={18} />新增分类</button></>;
  }

  function CategoryFormPage() {
    const editing = categories.find((category) => category.id === categoryEditId);
    return <><section className="sub-intro compact"><span>{template.label} · 分类口径</span><h1>{editing ? "编辑分类" : "新增分类"}</h1><p>已占用分类不可删除；编辑显示名称、提示和颜色不会改写历史流水的分类键。</p></section><form className="record-form secondary-form" onSubmit={saveCategory}><label>分类名称<input name="label" defaultValue={editing?.label} placeholder="例如：内容制作" /></label><label>分类提示<input name="hint" defaultValue={editing?.hint} placeholder="例如：活动素材、脚本与剪辑" /></label><label>分类颜色<select name="color" defaultValue={editing?.color || "#1677FF"}><option value="#1677FF">品牌蓝</option><option value="#12B76A">绿色</option><option value="#F79009">橙色</option><option value="#7F56D9">紫色</option><option value="#F04438">红色</option></select></label><div className="form-actions"><button type="submit" className="fixed-primary form-save"><Plus size={18} />{editing ? "保存分类" : "新增分类"}</button></div></form></>;
  }

  function NotificationsPage() {
    return <div className="notification-center"><section className="notification-summary"><span><Bell size={17} />消息中心</span><b>{unreadNotificationCount ? `${unreadNotificationCount} 条待查看` : "已全部查看"}</b><button onClick={() => setReadNotificationIds(notificationItems.map((item) => item.id))}>{unreadNotificationCount ? "全部标为已读" : "全部已读"}</button></section><section className="notification-list">{notificationItems.map((item) => { const read = readNotificationIds.includes(item.id); return <button key={item.id} className={`${item.tone}${read ? " read" : ""}`} onClick={() => openNotificationTarget(item)}><span className="notification-symbol">{item.tone === "risk" ? "!" : item.tone === "attention" ? "·" : "＝"}</span><div><span className="notification-impact">{notificationImpact(item)}</span><b>{item.title}</b><em>{item.copy}</em><small>＝ {item.action}</small></div><ChevronRight size={18} /></button>; })}</section></div>;
  }

  function ProfileSettingsPage() {
    const me = meQuery.data;
    const profileFailed = shouldShowProfileRecovery({ isProfileLoading: meQuery.isLoading, hasProfile: Boolean(me), isWorkspaceLoading: workspaceQuery.isLoading, hasWorkspace: Boolean(currentWorkspace), hasError: Boolean(meQuery.error || workspaceQuery.error) });
    const retryProfile = () => { void Promise.all([utils.auth.me.refetch(), utils.workspace.list.refetch()]); };
    if (!currentWorkspace || !me) return <div className="empty-state profile-load-state" role={profileFailed ? "alert" : "status"}><b>{profileFailed ? "个人与店铺资料暂时无法读取" : "正在读取个人与店铺资料…"}</b><p>{profileFailed ? "请检查网络或重新登录后再试；资料不会因此丢失。" : "正在同步账户和店铺信息，请稍候。"}</p><div className="empty-state-actions"><button type="button" onClick={retryProfile}>重新加载</button><button type="button" onClick={goBack}>返回我的</button></div></div>;
    const refreshProfile = async () => { await Promise.all([utils.auth.me.refetch(), utils.workspace.list.refetch()]); };
    const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await updateMe.mutateAsync({ name: String(data.get("name") || "").trim(), avatarAssetId: me.avatarAssetId || null, avatarPreset: String(data.get("avatarPreset") || "classic") as AvatarPresetId }); await updateWorkspace.mutateAsync({ workspaceId: currentWorkspace.id, name: String(data.get("workspaceName") || "").trim(), industryId: String(data.get("industryId")) as IndustryId, contactName: String(data.get("contactName") || "").trim(), logoAssetId: currentWorkspace.logoAssetId || null, logoPreset: String(data.get("logoPreset") || "store") as StorePresetId }); await refreshProfile(); notify("个人与店铺资料已保存"); setSubPage(null); setTab("profile"); } catch (error) { notify(error instanceof Error ? error.message : "资料保存失败"); } };
    const upload = async (file: File | undefined, kind: "user_avatar" | "workspace_logo") => { if (!file) return; try { const asset = await uploadMedia(file, kind, kind === "user_avatar" ? me.id : currentWorkspace.id); if (kind === "user_avatar") await updateMe.mutateAsync({ name: me.name, avatarAssetId: asset.id, avatarPreset: me.avatarPreset as AvatarPresetId | null }); else await updateWorkspace.mutateAsync({ workspaceId: currentWorkspace.id, name: currentWorkspace.name, industryId: currentWorkspace.industryId as IndustryId, contactName: currentWorkspace.contactName || me.name || "", logoAssetId: asset.id, logoPreset: currentWorkspace.logoPreset as StorePresetId | null }); await refreshProfile(); notify(kind === "user_avatar" ? "真实头像已上传，个人身份卡将优先展示" : "私有 Logo 已上传，店铺展示将优先使用"); } catch (error) { notify(error instanceof Error ? error.message : "图片上传失败"); } };
    return <form className="record-form profile-settings-form" onSubmit={save}><section className="sub-intro compact"><span>账户与店铺</span><h1>个人与店铺资料</h1><p>个人头像仅用于账户身份；店铺标识用于店铺展示；{cardCopy.imageManagementCopy}</p></section><section className="identity-settings-section"><div className="identity-settings-head"><BrandAvatar assetId={me.avatarAssetId} preset={me.avatarPreset} alt="个人头像" size="normal" /><span><b>个人头像</b><em>真实头像优先于预设；仅用于“我的”账户身份。</em></span></div><div className="avatar-preset-grid">{avatarPresets.map(({ id, label }) => <label key={id} className={(me.avatarPreset || "classic") === id ? "selected" : ""}><input type="radio" name="avatarPreset" value={id} defaultChecked={(me.avatarPreset || "classic") === id} /><BrandAvatar preset={id} alt={label} /><span>{label}</span></label>)}</div><label className="identity-inline-upload">上传真实头像<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0], "user_avatar")} /></label></section><section className="identity-settings-section store-settings-section"><div className="identity-settings-head"><BrandStoreLogo assetId={currentWorkspace.logoAssetId} preset={currentWorkspace.logoPreset} alt="店铺品牌标识" size="normal" /><span><b>店铺品牌</b><em>私有 Logo 优先于预设；用于首页标题栏和店铺资料。</em></span></div><div className="avatar-preset-grid store-preset-grid">{storePresets.map(({ id, label }) => <label key={id} className={(currentWorkspace.logoPreset || "store") === id ? "selected" : ""}><input type="radio" name="logoPreset" value={id} defaultChecked={(currentWorkspace.logoPreset || "store") === id} /><BrandStoreLogo preset={id} alt={label} /><span>{label}</span></label>)}</div><label className="identity-inline-upload">上传私有店铺 Logo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0], "workspace_logo")} /></label></section><label>您的姓名<input name="name" defaultValue={me.name} /></label><label>店铺名称<input name="workspaceName" defaultValue={currentWorkspace.name} /></label><label>经营行业<select name="industryId" defaultValue={currentWorkspace.industryId}><option value="canteen">餐饮</option><option value="retail">零售</option><option value="ecommerce">电商</option><option value="beauty">美业服务</option><option value="stall">小商贩</option></select></label><label>店铺联系人<input name="contactName" defaultValue={currentWorkspace.contactName || me.name || ""} /></label><button className="fixed-primary form-save" type="submit"><Check size={18} />保存资料</button></form>;
  }

  function renderContent() {
    if (subPage === "notifications") return NotificationsPage();
    if (subPage === "industry") return IndustryPage();
    if (subPage === "records") return RecordsPage();
    if (subPage === "record") return RecordPage();
    if (subPage === "recordDetail") return RecordDetailPage();
    if (subPage === "cards") return CardsPage();
    if (subPage === "cardDetail") return CardDetailPage();
    if (subPage === "cardForm") return CardFormPage();
    if (subPage === "bomForm") return BomFormPage();
    if (subPage === "pricing") return PricingPage();
    if (subPage === "budget") return BudgetPage();
    if (subPage === "healthSettings") return HealthSettingsPage();
    if (subPage === "salesTargets") return SalesTargetsPage();
    if (subPage === "reports") return ReportsPage();
    if (subPage === "reportDetail") return ReportDetailPage();
    if (subPage === "suppliers") return SuppliersPage();
    if (subPage === "supplierForm") return SupplierFormPage();
    if (subPage === "categories") return CategoriesPage();
    if (subPage === "categoryForm") return CategoryFormPage();
    if (subPage === "orders") return OrdersPage();
    if (subPage === "orderForm") return OrderFormPage();
    if (subPage === "orderDetail") return OrderDetailPage();
    if (subPage === "refundForm") return RefundFormPage();
    if (subPage === "skus") return SkusPage();
    if (subPage === "indirectCosts") return IndirectCostsPage();
    if (subPage === "profileSettings") return ProfileSettingsPage();
    if (subPage === "appearance") return AppearanceSettingsPage();
    if (subPage === "avatarStyle") return AvatarStylePage();
    if (subPage === "storeBrand") return StoreBrandPage();
    if (tab === "orders") return OrdersPage();
    if (tab === "cards") return CardsPage();
    if (tab === "analysis") return AnalysisPage();
    if (tab === "profile") return ProfilePage();
    return HomePage();
  }

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [{ id: "home", label: "工作台", icon: HomeIcon }, { id: "orders", label: "订单", icon: ReceiptText }, { id: "cards", label: cardCopy.tabLabel, icon: PackageOpen }, { id: "analysis", label: "洞察", icon: BarChart3 }, { id: "profile", label: "我的", icon: WalletCards }];
  const showQuickRecord = !isSub && tab !== "profile";
  return <div className="mobile-shell"><div className="app-frame">{renderHeader()}<main className={isSub ? "app-content sub-content" : "app-content"}>{renderContent()}</main>{showQuickRecord && <button className="global-record-fab" onClick={openNewRecord} aria-label="新增记一笔"><Plus size={20} aria-hidden="true" /><span>记一笔</span></button>}{!isSub && <nav className="tabbar" aria-label="主导航">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => { openRootTab(id); setRecordSearch(""); }}><Icon size={21} /><span>{label}</span></button>)}</nav>}{toast && <div className="app-toast" role="status" aria-live="polite">{toast}</div>}{unsavedVoucherLeave && <div className="voucher-guard-layer" role="alertdialog" aria-modal="true" aria-labelledby="voucher-guard-title" aria-describedby="voucher-guard-copy"><div className="voucher-guard-scrim" aria-hidden="true" onClick={cancelVoucherLeave} /><div className="voucher-guard-card"><CircleAlert size={22} aria-hidden="true" /><h2 id="voucher-guard-title">放弃未保存的凭证？</h2><p id="voucher-guard-copy">已上传的凭证图片尚未随流水保存，离开后将不保留。服务器暂存文件将按策略自动清理。</p><div className="voucher-guard-actions"><button type="button" className="voucher-guard-stay" onClick={cancelVoucherLeave}>留在本页</button><button type="button" className="voucher-guard-leave" onClick={discardVoucherAndLeave}>放弃凭证并离开</button></div></div></div>}</div></div>;
}

function useCloudBookSync(book: ReturnType<typeof useCostBook>) {
  const enabled = import.meta.env.VITE_SELF_HOSTED === "true";
  const workspaces = trpc.workspace.list.useQuery(undefined, { enabled, retry: false, refetchOnWindowFocus: false });
  const workspaceId = workspaces.data?.[0]?.id;
  const remote = trpc.workspace.book.useQuery({ workspaceId: workspaceId || "00000000-0000-0000-0000-000000000000" }, { enabled: enabled && Boolean(workspaceId), retry: false, refetchOnWindowFocus: false });
  const save = trpc.workspace.saveBook.useMutation();
  const hydrated = useRef(false);
  const revision = useRef(0);
  const lastSnapshot = useRef("");

  useEffect(() => {
    if (!enabled || !remote.data || hydrated.current || !workspaceId) return;
    const cloud = remote.data.book;
    revision.current = cloud.revision;
    if (Object.keys(cloud.state).length > 0) book.replaceState(cloud.state);
    lastSnapshot.current = JSON.stringify(Object.keys(cloud.state).length > 0 ? cloud.state : book.snapshot);
    hydrated.current = true;
    if (Object.keys(cloud.state).length === 0) save.mutate({ workspaceId, expectedRevision: cloud.revision, schemaVersion: book.snapshot.schemaVersion, state: book.snapshot });
  }, [book, enabled, remote.data, save, workspaceId]);

  useEffect(() => {
    if (!enabled || !workspaceId || !hydrated.current || save.isPending) return;
    const next = JSON.stringify(book.snapshot);
    if (next === lastSnapshot.current) return;
    const timer = window.setTimeout(async () => {
      const result = await save.mutateAsync({ workspaceId, expectedRevision: revision.current, schemaVersion: book.snapshot.schemaVersion, state: book.snapshot });
      if (result.conflict) {
        hydrated.current = false;
        await remote.refetch();
        return;
      }
      revision.current = result.revision;
      lastSnapshot.current = next;
    }, 650);
    return () => window.clearTimeout(timer);
  }, [book.snapshot, enabled, remote, save, workspaceId]);
}
