/**
 * 移动账本 App：四个一级入口与可返回的业务页面栈。
 * 所有金额、分类、流水、成本卡与图表均通过统一行业化 Store 读取和更新。
 * 视觉规范：Digital Blue #087FF5、深海军蓝 #0B1836、冷白背景与紧凑圆角卡片。
 * 首页中产品宣传 Banner 只服务产品/广告，经营提醒只在 Logo 旁以文字轮播呈现，避免挤占利润—趋势—预算主线。
 */
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  LineChart,
  PackageOpen,
  Pencil,
  Pause,
  Plus,
  Play,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UsersRound,
  Utensils,
  WalletCards,
} from "lucide-react";
import {
  calcCard,
  industryTemplates,
  type CostCard,
  type CostRecord,
  type IndustryId,
  type RecordType,
  useCostBook,
} from "@/lib/cost-book";
import { channelLabel, type OrderChannel, type RefundReason, type ReturnRecoveryStatus } from "@/lib/order-ledger";
import { breakEvenPrice, quotePrice } from "@/lib/pricing";
import { availableMonths, matchesMonth, matchesQuery } from "@/lib/list-search";
import { buildBudgetBurn, buildCategoryDeltas, buildRefundPareto } from "@/lib/chart-metrics";
import { buildHomeDecision, type HomeDecision, type HomeDecisionNotification, type HomeDecisionTarget } from "@/lib/home-decision";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type TabId = "home" | "orders" | "cards" | "analysis" | "profile";
type SubPage = "notifications" | "industry" | "records" | "record" | "recordDetail" | "cards" | "cardDetail" | "cardForm" | "bomForm" | "pricing" | "budget" | "reports" | "reportDetail" | "suppliers" | "supplierForm" | "categories" | "categoryForm" | "orders" | "orderForm" | "orderDetail" | "refundForm" | "skus" | null;
type RecordFilter = "all" | RecordType;
type DraftMaterial = { name: string; spec: string; quantity: string; amount: number };
type QuickAction = "order" | "budget" | "cards" | "record" | "analysis";
type PromotionTarget = "cards" | "orders" | "industry";
type NotificationTarget = HomeDecisionTarget;
type NotificationItem = HomeDecisionNotification & { copy: string };
type IndustryHomeProfile = {
  quick: { action: QuickAction; label: string; detail: string; icon: LucideIcon }[];
  insight: { eyebrow: string; title: string; copy: string; focusCategoryKey: string };
};

const deepLinkTabs: TabId[] = ["home", "orders", "cards", "analysis", "profile"];
const deepLinkSubPages: Exclude<SubPage, null>[] = ["notifications", "industry", "records", "record", "recordDetail", "cardDetail", "cardForm", "pricing", "budget", "reports", "reportDetail", "suppliers", "supplierForm", "categories", "categoryForm", "orderForm", "orderDetail", "refundForm", "skus"];
const requestedParams = new URLSearchParams(window.location.search);
const requestedScreen = requestedParams.get("screen");
const requestedQuery = requestedParams.get("q") || "";
const requestedMonth = requestedParams.get("month") || "all";
const initialTab: TabId = deepLinkTabs.includes(requestedScreen as TabId) ? requestedScreen as TabId : "home";
const initialSubPage: SubPage = deepLinkSubPages.includes(requestedScreen as Exclude<SubPage, null>) ? requestedScreen as Exclude<SubPage, null> : null;

const format = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const yuan = (amount: number) => `¥${format.format(Math.round(amount))}`;
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
const promotionBanners: { eyebrow: string; title: string; copy: string; action: string; target: PromotionTarget; asset: string }[] = [
  { eyebrow: "产品功能", title: "成本卡，一键算出保本价", copy: "材料、人工、渠道费统一核算", action: "去测算", target: "cards", asset: "/manus-storage/banner-3d-cost-card_583c5d5c.png" },
  { eyebrow: "产品功能", title: "订单、退款与商品成本，放进一张账", copy: "每一笔成交都能复核真实贡献利润", action: "查看订单", target: "orders", asset: "/manus-storage/banner-3d-pricing-tag_9e81aaad.png" },
  { eyebrow: "行业模板", title: "按行业切换成本口径，历史账本不丢失", copy: "餐饮、零售、电商、美业、小商贩", action: "切换行业", target: "industry", asset: "/manus-storage/banner-3d-ledger-stack_c219d6f4.png" },
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
function OperatingSnapshot({ decision, industryRisk, onOpenPriority }: { decision: HomeDecision; industryRisk: string; onOpenPriority: (priority: HomeDecisionNotification) => void }) {
  const priority = decision.priority;
  return <section className="operating-snapshot home-decision" aria-labelledby="home-decision-title"><div className="home-decision-result"><em>净营收 − 本月成本 ＝ 本期结果</em><strong><span id="home-decision-title">{decision.result.label}</span><b>{yuan(decision.result.amount)}</b></strong></div><dl className="home-decision-metrics">{decision.metrics.map((metric) => <div key={metric.key} data-tone={metric.tone}><dt>{metric.label}</dt><dd>{yuan(metric.amount)}</dd></div>)}</dl><p className="home-decision-industry-note"><Sparkles size={13} aria-hidden="true" /><span>{industryRisk}</span></p>{priority && <button className="home-decision-risk" data-tone={priority.tone} onClick={() => onOpenPriority(priority)}><CircleAlert size={16} aria-hidden="true" /><span><em>优先处理</em><b>{priority.title}</b></span><small>{priority.action}</small><ChevronRight size={17} aria-hidden="true" /></button>}</section>;
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
  return <section className="profit-waterfall"><div className="chart-heading"><span>本期利润形成</span><b>{profit >= 0 ? "经营利润" : "经营亏损"} {yuan(Math.abs(profit))}</b></div><div className="waterfall-plot">{steps.map((step) => { const bottom = (Math.min(step.from, step.to) - low) / range * 100; const height = Math.max(5, Math.abs(step.to - step.from) / range * 100); return <button key={step.key} className={step.kind} onClick={() => onSelect(step.key)}><i style={{ bottom: `${bottom}%`, height: `${height}%` }} /><strong>{step.amount < 0 ? "−" : ""}{yuan(Math.abs(step.amount))}</strong><span>{step.label}</span></button>; })}</div></section>;
}
function BudgetRing({ burn, onClick }: { burn: ReturnType<typeof buildBudgetBurn>; onClick: () => void }) {
  const usedRate = Math.min(100, Math.max(0, burn.usedRate));
  const tone = "#087ff5";
  return <button className={`budget-ring ${burn.state}`} onClick={onClick}><i style={{ background: `conic-gradient(${tone} 0 ${usedRate}%, #e9eef4 ${usedRate}% 100%)` }}><span><em>已用</em><b>{usedRate}%</b><strong>{yuan(burn.used)}</strong></span></i><div><label><em>本月预算</em><b>{yuan(burn.budget)}</b></label><label><em>剩余可用</em><b>{yuan(burn.remaining)}</b></label></div><small>{burn.state === "over" ? `已超预算 ${yuan(Math.abs(burn.remaining))}` : burn.state === "risk" ? `月末预计超预算 ${yuan(Math.max(0, burn.forecast - burn.budget))}` : `月末预计 ${yuan(burn.forecast)}`}</small></button>;
}
function RefundPareto({ items, onSelect }: { items: ReturnType<typeof buildRefundPareto>; onSelect: (reason: string) => void }) {
  if (!items.length) return <div className="chart-empty">本期无退款</div>;
  const max = Math.max(...items.map((item) => item.amount), 1);
  return <section className="refund-pareto"><div className="chart-heading"><span>退款原因</span><b>{yuan(items.reduce((sum, item) => sum + item.amount, 0))}</b></div>{items.slice(0, 6).map((item) => <button key={item.reason} onClick={() => onSelect(item.label)}><span>{item.label}<small>{item.quantity} 件 · 累计 {item.cumulativeShare}%</small></span><i><em style={{ width: `${Math.max(8, item.amount / max * 100)}%` }} /></i><strong>{yuan(item.amount)}</strong></button>)}</section>;
}
const today = "2026-07-14";

export default function Home() {
  const book = useCostBook();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [subPage, setSubPage] = useState<SubPage>(initialSubPage);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>(book.activeIndustryId);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [recordSearch, setRecordSearch] = useState(requestedScreen === "records" ? requestedQuery : "");
  const [recordMonth, setRecordMonth] = useState(requestedScreen === "records" ? requestedMonth : "all");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formMerchant, setFormMerchant] = useState("");
  const [formNote, setFormNote] = useState("");
  const [cardId, setCardId] = useState<string | null>(() => ["cardDetail", "pricing"].includes(requestedScreen || "") ? book.cards[0]?.id ?? null : null);
  const [bomItemId, setBomItemId] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [analysisPeriod, setAnalysisPeriod] = useState<"current" | "last">("current");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [draftOrderLines, setDraftOrderLines] = useState<{ skuId: string; quantity: number }[]>([]);
  const [draftMaterials, setDraftMaterials] = useState<DraftMaterial[]>([]);
  const [pricingPlatformRate, setPricingPlatformRate] = useState(0);
  const [pricingFulfillmentCost, setPricingFulfillmentCost] = useState(0);
  const [pricingTargetMargin, setPricingTargetMargin] = useState(40);
  const [pricingRoundingStep, setPricingRoundingStep] = useState(1);
  const [pricingChannel, setPricingChannel] = useState<OrderChannel>("platform");
  const [competitorLow, setCompetitorLow] = useState(0);
  const [competitorHigh, setCompetitorHigh] = useState(0);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [orderChannel, setOrderChannel] = useState<OrderChannel>("platform");
  const [orderMonth, setOrderMonth] = useState(requestedScreen === "orders" ? requestedMonth : "all");
  const [orderSearch, setOrderSearch] = useState(requestedScreen === "orders" ? requestedQuery : "");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "low_profit" | "refund">("all");
  const [orderSearchOpen, setOrderSearchOpen] = useState(Boolean(requestedQuery));
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [promotionPaused, setPromotionPaused] = useState(false);
  const [reminderIndex, setReminderIndex] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();

  const { template, categories, records, cards, skus, skuMetrics, orders, refunds, suppliers, reports, totals, trend, hiddenCosts, currentPeriod, channelTemplates, orderWarnings } = book;
  const IndustryIcon = iconByIndustry[book.activeIndustryId];
  const isSub = subPage !== null;
  const categoryByKey = useMemo(() => new Map(categories.map((category) => [category.key, category])), [categories]);
  const activeRecord = records.find((record) => record.id === recordId) ?? null;
  const activeCard = cards.find((card) => card.id === cardId) ?? null;
  const activeReport = reports.find((report) => report.id === reportId) ?? null;
  const activeOrder = orders.find((order) => order.id === orderId) ?? null;
  const activeOrderLine = activeOrder?.lines.find((line) => line.id === orderLineId) ?? null;
  const activeBomItem = activeCard?.items.find((item) => item.id === bomItemId) ?? null;
  const cardCost = activeCard ? calcCard(activeCard) : null;
  const currentCategoryKey = selectedCategoryKey || categories[0]?.key || "";
  const recordMonths = useMemo(() => availableMonths(records.map((record) => record.date)), [records]);
  const orderMonths = useMemo(() => availableMonths(orders.map((order) => order.occurredAt)), [orders]);
  const [periodYear, periodMonth] = currentPeriod.split("-").map(Number);
  const currentDay = Math.min(Number(today.slice(-2)), new Date(periodYear, periodMonth, 0).getDate());
  const budgetBurn = useMemo(() => buildBudgetBurn({ budget: totals.budget, used: totals.totalCost, dayOfMonth: currentDay, daysInMonth: new Date(periodYear, periodMonth, 0).getDate() }), [currentDay, periodMonth, periodYear, totals.budget, totals.totalCost]);
  const notificationItems = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const topCategory = totals.categoryTotals[0];
    const risingCard = cards.find((card) => card.status === "risk" || card.status === "attention");
    const periodRefunds = refunds.filter((refund) => refund.occurredAt.startsWith(currentPeriod));
    if (budgetBurn.state === "over") items.push({ id: "budget-over", tone: "risk", title: `预算已超 ${yuan(Math.abs(totals.budgetRemaining))}`, copy: `本月成本已高于预算，${topCategory?.label || "经营成本"}需要优先复核。`, action: "查看预算结构", target: "budget" });
    else if (budgetBurn.state === "risk") items.push({ id: "budget-risk", tone: "attention", title: `月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}`, copy: `按当前入账节奏推算，建议先控制 ${topCategory?.label || "本月成本"}。`, action: "查看预算预测", target: "budget" });
    else items.push({ id: "budget-steady", tone: "notice", title: `月末预计结余 ${yuan(Math.max(0, budgetBurn.budget - budgetBurn.forecast))}`, copy: `本月预算仍可控，当前剩余 ${yuan(totals.budgetRemaining)}。`, action: "查看预算进度", target: "budget" });
    if (risingCard) items.push({ id: `card-${risingCard.id}`, tone: risingCard.status === "risk" ? "risk" : "attention", title: `${risingCard.name}成本需要复核`, copy: risingCard.status === "risk" ? "单位成本或售价存在风险，先检查材料、人工与分摊。" : "近期单位成本上升，建议核对供应商与成本构成。", action: "查看成本卡", target: "cards" });
    if (orderWarnings.length) items.push({ id: "order-warning", tone: "risk", title: `${orderWarnings.length} 笔订单低于利润目标`, copy: "渠道费用与商品成本已冻结，可优先复核低于保本价的成交。", action: "查看低利润订单", target: "orders" });
    if (periodRefunds.length) { const refundAmount = periodRefunds.reduce((sum, refund) => sum + refund.refundFen / 100, 0); items.push({ id: "refund-watch", tone: "attention", title: `本期退款 ${yuan(refundAmount)}`, copy: `${periodRefunds.length} 笔退款已同步影响本期净营收与商品成本。`, action: "查看退款订单", target: "orders" }); }
    if (topCategory && !risingCard) items.push({ id: `cost-${topCategory.key}`, tone: "notice", title: `${topCategory.label}占成本 ${Math.round(topCategory.amount / Math.max(totals.totalCost, 1) * 100)}%`, copy: "当前为第一成本，可在流水中核对相关支出明细。", action: "查看成本流水", target: "records" });
    return items;
  }, [budgetBurn, cards, currentPeriod, orderWarnings.length, refunds, totals.budgetRemaining, totals.categoryTotals, totals.totalCost]);
  const activeReminder = notificationItems[reminderIndex % notificationItems.length] || notificationItems[0];
  const unreadNotificationCount = notificationItems.filter((item) => !readNotificationIds.includes(item.id)).length;
  const homeDecision = useMemo(() => buildHomeDecision({ industryLabel: template.label, period: currentPeriod, revenue: totals.revenue, cost: totals.totalCost, operatingProfit: totals.operatingProfit, budgetRemaining: totals.budgetRemaining, budgetState: budgetBurn.state, budget: totals.budget, budgetForecast: budgetBurn.forecast, notifications: notificationItems }), [budgetBurn.forecast, budgetBurn.state, currentPeriod, notificationItems, template.label, totals.budget, totals.budgetRemaining, totals.operatingProfit, totals.revenue, totals.totalCost]);

  useEffect(() => {
    if (promotionPaused || reducedMotion) return;
    const timer = window.setInterval(() => setPromotionIndex((index) => (index + 1) % promotionBanners.length), 4200);
    return () => window.clearInterval(timer);
  }, [promotionPaused, reducedMotion]);

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
    return matchesType && matchesCurrentMonth && matchesSearch;
  });

  const filteredOrders = orders.filter((order) => {
    const search = orderSearch.trim().toLowerCase();
    const matchesCurrentMonth = matchesMonth(order.occurredAt, orderMonth);
    const relatedRefundReasons = refunds.filter((refund) => refund.orderId === order.id).map((refund) => refundReasonLabel(refund.reason));
    const matchesSearch = matchesQuery([order.orderNo, order.buyer, channelLabel[order.channel], order.occurredAt, ...relatedRefundReasons, ...order.lines.flatMap((line) => [line.skuName, line.skuCode])], search);
    const warning = orderWarnings.some((item) => item.orderId === order.id);
    const isRefunded = order.status === "partially_refunded" || order.status === "refunded";
    const matchesStatus = orderStatusFilter === "all" || (orderStatusFilter === "low_profit" && warning) || (orderStatusFilter === "refund" && isRefunded);
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

  function goSub(page: SubPage) { setSubPage(page); }
  function openOrdersContext(filter: "all" | "low_profit" | "refund" = "all") {
    setOrderStatusFilter(filter);
    setOrderSearchOpen(false);
    setTab("orders");
    setSubPage(null);
  }
  function openPromotion(target: PromotionTarget) {
    if (target === "orders") { openOrdersContext(); return; }
    goSub(target);
  }
  function openNotificationTarget(item: NotificationItem) {
    setReadNotificationIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    if (item.target === "orders") { openOrdersContext(item.id === "refund-watch" ? "refund" : "low_profit"); return; }
    goSub(item.target);
  }
  function openHomeDecision(priority: HomeDecisionNotification) {
    if (priority.target === "orders") { openOrdersContext(priority.id === "refund-watch" ? "refund" : "low_profit"); return; }
    goSub(priority.target);
  }
  function runQuickAction(action: QuickAction) {
    if (action === "order") { openNewOrder(); return; }
    if (action === "record") { openNewRecord(); return; }
    if (action === "budget") { goSub("budget"); return; }
    if (action === "cards") { goSub("cards"); return; }
    setTab("analysis");
  }
  function goBack() {
    if (subPage === "bomForm") { setSubPage("cardDetail"); return; }
    if (subPage === "pricing") { setSubPage("cardDetail"); return; }
    if (subPage === "cardForm") { setSubPage("cards"); return; }
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
    setSelectedCategoryKey(categories[0]?.key || "");
    setHasAttachment(false);
    setFormAmount("");
    setFormDate(today);
    setFormMerchant("");
    setFormNote("");
    goSub("record");
  }

  function openRecordDetail(id: string) { setRecordId(id); goSub("recordDetail"); }
  function openCard(id: string) { setCardId(id); goSub("cardDetail"); }
  function openNewCard() { setCardId(null); setDraftMaterials([{ name: "直接材料", spec: "", quantity: `1 ${template.unitLabel}`, amount: 0 }]); goSub("cardForm"); }
  function editCard() { if (!activeCard) return; setDraftMaterials(activeCard.items.map((item) => ({ name: item.name, spec: item.spec, quantity: item.quantity, amount: item.amount }))); goSub("cardForm"); }
  function openPricing() { if (!activeCard) return; const config = channelTemplates.platform; setPricingChannel("platform"); setPricingPlatformRate(config.commissionRatePct); setPricingFulfillmentCost(config.fulfillmentCost); setPricingTargetMargin(config.targetContributionMarginPct); setPricingRoundingStep(config.roundingStep); setCompetitorLow(0); setCompetitorHigh(0); setPromotionDiscount(0); goSub("pricing"); }
  function openReport(id: string) { setReportId(id); goSub("reportDetail"); }
  function openOrder(id: string) { setOrderId(id); setOrderLineId(null); goSub("orderDetail"); }
  function openNewOrder() {
    if (!skus.length) {
      setTab("cards");
      setSubPage(null);
      notify(`请先新增${template.entityLabel}成本卡，系统会自动创建可下单 SKU`);
      return;
    }
    setDraftOrderLines([{ skuId: skus[0].id, quantity: 1 }]);
    setOrderId(null);
    setOrderChannel("platform");
    goSub("orderForm");
  }
  function saveOrder(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const lines = draftOrderLines.filter((line) => line.skuId && line.quantity > 0); if (!lines.length) return notify("请至少选择一个 SKU 并填写数量"); book.addOrder({ orderNo: String(data.get("orderNo") || ""), channel: orderChannel, buyer: String(data.get("buyer") || ""), date: String(data.get("date") || today), lines }); notify("订单已入账：销售收入、商品成本和渠道费用预警已同步生成"); setSubPage("orders"); }
  function saveRefund(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!activeOrder || !activeOrderLine) return notify("请先选择订单 SKU"); const data = new FormData(event.currentTarget); const result = book.createRefund({ orderId: activeOrder.id, lineId: activeOrderLine.id, quantity: Number(data.get("quantity")), refundAmount: Number(data.get("refundAmount")), refundFee: Number(data.get("refundFee") || 0), reason: String(data.get("reason")) as RefundReason, recoveryStatus: String(data.get("recoveryStatus")) as ReturnRecoveryStatus, date: String(data.get("date") || today) }); if (!result.ok) return notify(result.reason || "退款登记失败"); notify("退款已登记，净营收与商品成本已同步更新"); setSubPage("orderDetail"); }
  function saveSkuCost(event: FormEvent<HTMLFormElement>, skuId: string) { event.preventDefault(); const cost = Number(new FormData(event.currentTarget).get("unitCost")); const result = book.updateSkuCost(skuId, cost); notify(result.ok ? "SKU 单位成本已更新，仅作用于后续订单" : result.reason || "成本更新失败"); }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(formAmount);
    const merchant = formMerchant.trim();
    const date = formDate;
    const note = formNote.trim();
    if (!amount || amount <= 0) return notify("请填写正确的金额");
    if (!merchant) return notify("请填写商户或对方名称");
    const data = new FormData(event.currentTarget);
    const refundFee = Number(data.get("refundFee") || 0);
    const recovery = Number(data.get("recovery") || 0);
    const payload = { categoryKey: currentCategoryKey, date, type: recordType, amount, merchant, note, status: "accounted" as const, hasAttachment, refundFee, recovery };
    if (recordId) {
      book.updateRecord(recordId, payload);
      notify(`已更新 ${yuan(amount)} 记录`);
    } else {
      book.addRecord(payload);
      notify(`已新增 ${yuan(amount)} 记录`);
    }
    setRecordId(null);
    setSubPage("records");
  }

  function editRecord() {
    if (!activeRecord) return;
    setRecordType(activeRecord.type);
    setSelectedCategoryKey(activeRecord.categoryKey);
    setHasAttachment(activeRecord.hasAttachment);
    setFormAmount(String(activeRecord.amount));
    setFormDate(activeRecord.date);
    setFormMerchant(activeRecord.merchant);
    setFormNote(activeRecord.note);
    setSubPage("record");
  }

  function deleteRecord() {
    if (!activeRecord) return;
    if (!window.confirm(`确认删除“${activeRecord.merchant}”这笔记录吗？`)) return;
    book.removeRecord(activeRecord.id);
    notify("记录已删除，预算和分析已同步更新");
    setRecordId(null);
    setSubPage("records");
  }

  function applyIndustry() {
    if (selectedIndustry === book.activeIndustryId) return notify("当前已是该行业模板");
    book.switchIndustry(selectedIndustry);
    setSelectedCategoryKey("");
    setSubPage(null);
    setTab("profile");
    notify(`已切换为${industryTemplates[selectedIndustry].label}模板；历史账本已保留`);
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budget = Number(new FormData(event.currentTarget).get("budget"));
    if (!budget || budget <= 0) return notify("请输入正确的预算金额");
    book.updateBudget(budget);
    notify("月度预算已更新");
    setSubPage(null);
  }

  function saveBomItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCard) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const amount = Number(data.get("amount"));
    if (!name || !amount || amount <= 0) return notify("请补充成本项名称和金额");
    const input = { name, amount, spec: String(data.get("spec") || ""), quantity: String(data.get("quantity") || "1 份") };
    if (activeBomItem) { book.updateBomItem(activeCard.id, activeBomItem.id, input); notify("成本项已更新，单位成本和 SKU 已同步重算"); }
    else { book.addBomItem(activeCard.id, input); notify("成本项已加入，单位成本已重算"); }
    setBomItemId(null);
    setSubPage("cardDetail");
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const salePrice = Number(data.get("salePrice"));
    const labor = Number(data.get("labor") || 0);
    const overhead = Number(data.get("overhead") || 0);
    const items = draftMaterials.map((item) => ({ ...item, name: item.name.trim(), spec: item.spec.trim(), quantity: item.quantity.trim(), amount: Number(item.amount) }));
    if (!name || salePrice <= 0 || labor < 0 || overhead < 0) return notify("请填写名称、售价和正确的成本金额");
    if (!items.length || items.some((item) => !item.name || !item.quantity || !Number.isFinite(item.amount) || item.amount < 0)) return notify("请至少保留一项材料，并补齐名称、数量和金额");
    const input = { name, kind: String(data.get("kind") || "").trim(), unit: String(data.get("unit") || "").trim(), salePrice, labor, overhead, items };
    if (activeCard) { book.updateCard(activeCard.id, input); notify("成本卡已更新，SKU 将同步用于后续订单"); setSubPage("cardDetail"); }
    else { book.addCard(input); notify("成本卡已新增，并自动创建关联 SKU"); setSubPage("cards"); }
  }

  function deleteCard() {
    if (!activeCard || !window.confirm(`确认删除成本卡“${activeCard.name}”吗？`)) return;
    const result = book.removeCard(activeCard.id);
    notify(result.ok ? "成本卡和未使用 SKU 已删除" : result.reason || "无法删除成本卡");
    if (result.ok) { setCardId(null); setSubPage("cards"); }
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return notify("请输入供应商名称");
    book.addSupplier({ name, contact: String(data.get("contact") || ""), categoryKey: String(data.get("categoryKey") || categories[0]?.key || "") });
    notify("供应商已新增");
    setSubPage("suppliers");
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") || "").trim();
    if (!label) return notify("请输入分类名称");
    book.addCategory({ key: `custom_${Date.now()}`, label, color: String(data.get("color") || "#1677FF"), hint: "自定义分类" });
    notify("分类已新增");
    setSubPage("categories");
  }

  function renderHeader() {
    const titles: Record<Exclude<SubPage, null>, string> = { notifications: "消息中心", industry: "切换行业", records: "经营流水", record: recordId ? "编辑记录" : "记一笔", recordDetail: "流水详情", cards: `${template.entityLabel}成本卡`, cardDetail: `${template.entityLabel}成本详情`, cardForm: activeCard ? `编辑${template.entityLabel}` : `新增${template.entityLabel}`, bomForm: activeBomItem ? `编辑${template.formulaLabel}项` : `添加${template.formulaLabel}项`, pricing: "智能测算定价", budget: "预算管理", reports: "成本报表", reportDetail: "报表详情", suppliers: "供应商", supplierForm: "新增供应商", categories: "分类管理", categoryForm: "新增分类", orders: "订单账本", orderForm: "记录订单", orderDetail: "订单详情", refundForm: "登记退款", skus: "SKU 商品成本" };
    if (isSub) return <header className="page-header sub-header"><button className="back-button" onClick={goBack} aria-label="返回"><ArrowLeft size={21} /></button><strong>{titles[subPage]}</strong><span /></header>;
    return <header className={`page-header ${tab === "orders" ? "orders-prototype-header" : ""}`}><div className="brand-mini"><img src="/manus-storage/suandeqing-logo-3d_b82ea984.png" alt="算得清" /><span><strong>算得清</strong><em>{template.label}成本账本</em></span></div>{tab === "home" && activeReminder ? <button className="header-reminder-ticker" onClick={() => goSub("notifications")} aria-label={`经营提醒：${activeReminder.title}，打开消息中心查看详情`}><Bell size={14} /><span key={activeReminder.id}>{activeReminder.title}</span><i>{unreadNotificationCount || ""}</i></button> : tab === "cards" ? <button className="header-primary-action" onClick={openNewCard}><Plus size={16} />新增成本卡</button> : tab === "orders" ? <span /> : <button className="header-icon" onClick={() => goSub("notifications")} aria-label="经营提醒"><Bell size={20} />{unreadNotificationCount > 0 && <i />}</button>}</header>;
  }

  function HomePage() {
    const latestTrend = trend.at(-1);
    const latestCost = latestTrend?.cost ?? 0;
    const maxTrendCost = Math.max(...trend.map((point) => point.cost), 1);
    const trendAmount = (amount: number) => amount === 0 ? "—" : amount >= 10000 ? `¥${(amount / 10000).toFixed(1)}万` : yuan(amount);
    const homeProfile = industryHomeProfiles[book.activeIndustryId];
    const IndustryIcon = iconByIndustry[book.activeIndustryId];
    const focusCategory = totals.categoryTotals.find((category) => category.key === homeProfile.insight.focusCategoryKey);
    const topCategory = totals.categoryTotals[0];
    return <div className="prototype-home">
      <section className="dashboard-kicker"><span><i><IndustryIcon size={15} aria-hidden="true" /></i><b>{homeDecision.context.industryLabel} · {homeDecision.context.period.replace("-", " 年 ")} 月</b><em>{focusCategory?.label || homeProfile.insight.eyebrow}</em></span></section>
      <OperatingSnapshot decision={homeDecision} industryRisk={homeProfile.insight.title} onOpenPriority={openHomeDecision} />
      <section className="home-promotion" aria-roledescription="carousel" aria-label="算得清产品宣传" onMouseEnter={() => setPromotionPaused(true)} onMouseLeave={() => setPromotionPaused(false)} onFocusCapture={() => setPromotionPaused(true)} onBlurCapture={() => setPromotionPaused(false)}><div className="promotion-track" style={{ transform: `translateX(-${promotionIndex * 100}%)` }}>{promotionBanners.map((banner) => <button key={banner.title} className="promotion-slide" onClick={() => openPromotion(banner.target)} aria-label={`${banner.title}，${banner.action}`}><span className="promotion-copy"><em>{banner.eyebrow}</em><b>{banner.title}</b><small>{banner.copy}</small><strong>{banner.action}<ChevronRight size={14} /></strong></span><img className="promotion-3d-asset" src={banner.asset} alt="" aria-hidden="true" /></button>)}</div><div className="promotion-dots">{promotionBanners.map((banner, index) => <button key={banner.title} className={index === promotionIndex ? "active" : ""} onClick={() => setPromotionIndex(index)} aria-label={`查看第 ${index + 1} 张宣传卡`} aria-current={index === promotionIndex ? "true" : undefined} />)}<button className="promotion-motion-control" onClick={() => setPromotionPaused((value) => !value)} aria-label={promotionPaused ? "播放宣传轮播" : "暂停宣传轮播"}>{promotionPaused ? <Play size={10} /> : <Pause size={10} />}</button></div></section>
      <button className="home-cost-trend" onClick={() => setTab("analysis")}><div><b>成本趋势</b><span><strong>{trendAmount(latestCost)}</strong><em>本月成本</em></span></div><section>{trend.map((point, index) => <span key={point.month}><b>{trendAmount(point.cost)}</b><i style={{ height: `${Math.max(8, point.cost / maxTrendCost * 100)}%` }} className={index === trend.length - 1 ? "active" : ""} /><em>{point.month.slice(5)}月</em></span>)}</section></button>
      <button className="home-data-row" onClick={() => goSub("budget")}><span className="home-row-icon"><WalletCards size={19} /></span><b>预算剩余</b><strong>{yuan(totals.budgetRemaining)}</strong><ChevronRight size={18} /></button>
      <button className="home-data-row" onClick={() => { if (topCategory) { setRecordSearch(topCategory.label); setRecordMonth(currentPeriod); goSub("records"); } }}><span className="home-row-icon"><ShoppingBag size={19} /></span><span><em>第一成本</em><b>{topCategory?.label || homeProfile.insight.title}</b></span><strong>{topCategory ? `${Math.round(topCategory.amount / Math.max(totals.totalCost, 1) * 100)}%` : "—"}</strong><ChevronRight size={18} /></button>
    </div>;
  }

  function OrdersPage() {
    const hasFilter = orderMonth !== "all" || Boolean(orderSearch.trim()) || orderStatusFilter !== "all";
    const periodRefunds = refunds.filter((refund) => orderMonth === "all" || matchesMonth(refund.occurredAt, orderMonth));
    const refundPareto = buildRefundPareto(periodRefunds);
    return <div className="prototype-orders"><section className="orders-page-title"><h1>订单</h1><div><button onClick={() => setOrderSearchOpen((value) => !value)} aria-label="搜索订单"><Search size={25} /></button><button onClick={openNewOrder} aria-label="新增订单"><Plus size={25} /></button></div></section><div className="orders-month-row"><label className="month-filter"><CalendarDays size={20} /><select aria-label="筛选订单月份" value={orderMonth} onChange={(event) => setOrderMonth(event.target.value)}><option value="all">全部月份</option>{orderMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div>{orderSearchOpen && <label className="search-field order-search"><Search size={16} /><input autoFocus value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="搜索订单号、客户或 SKU" /></label>}<div className="order-filter-chips"><button className={orderStatusFilter === "all" ? "active" : ""} onClick={() => setOrderStatusFilter("all")}>全部</button><button className={orderStatusFilter === "low_profit" ? "active" : ""} onClick={() => setOrderStatusFilter("low_profit")}>低利润</button><button className={orderStatusFilter === "refund" ? "active" : ""} onClick={() => setOrderStatusFilter("refund")}>退款</button></div><div className="order-list">{filteredOrders.map((order) => { const revenue = order.lines.reduce((sum, line) => sum + line.unitPriceFen * line.quantity / 100, 0); const cogs = order.lines.reduce((sum, line) => sum + line.unitCostFen * line.quantity / 100, 0); const fulfillment = order.lines.reduce((sum, line) => sum + line.quantity, 0) * order.pricing.fulfillmentCost; const contribution = revenue * (1 - order.pricing.commissionRatePct / 100) - cogs - fulfillment; const warning = orderWarnings.find((item) => item.orderId === order.id); return <button key={order.id} onClick={() => openOrder(order.id)}><div><b><Highlight value={order.orderNo || "未编号订单"} query={orderSearch} /></b><em><Highlight value={order.buyer || "散客"} query={orderSearch} /></em><small><Highlight value={channelLabel[order.channel]} query={orderSearch} /></small></div><span className="order-time">{order.occurredAt.slice(5)}<ChevronRight size={17} /></span><strong>{yuan(revenue)}<em className={warning ? "attention" : ""}>{warning ? (warning.type === "below_break_even" ? "低于保本" : "低于目标") : `贡献利润 ${yuan(contribution)}`}</em></strong></button>; })}{!filteredOrders.length && <div className="empty-state business-empty">{hasFilter ? <><b>没有匹配结果</b><p>{`“${orderSearch || monthLabel(orderMonth)}”下暂无订单，试试更换月份或关键词。`}</p></> : <><span>＋</span><b>还没有订单</b><p>记录第一笔订单，开始算清这笔生意的收入、成本和利润。</p><button onClick={openNewOrder}>＋ 记录第一笔订单</button></>}</div>}</div><section className="after-sale-status"><div><b>售后处理</b><span>{periodRefunds.length ? "全部售后" : "本期无退款"}</span></div>{!periodRefunds.length && <p>✓</p>}{periodRefunds.length > 0 && <ChevronRight size={18} />}</section>{refundPareto.length >= 2 && <section className="order-refund-chart"><div className="section-title"><div><span>售后原因</span><h2>退款占比</h2></div></div><RefundPareto items={refundPareto} onSelect={(reason) => { setOrderStatusFilter("refund"); setOrderSearch(reason); setOrderSearchOpen(true); }} /></section>}<button className="fixed-primary list-primary" onClick={openNewOrder}><Plus size={18} />记录订单</button></div>;
  }

  function OrderFormPage() {
    if (!skus.length) return <><section className="sub-intro compact"><span>{template.label} · 订单入账</span><h1>先建立商品成本</h1><p>订单需要关联 SKU，SKU 会由成本卡自动创建，并冻结后续订单的单位成本。</p></section><section className="order-prerequisite"><span>SKU ＝ 成本卡 ＋ 售价</span><b>当前行业还没有可下单的商品成本</b><em>先建立一张成本卡，再回到订单页记录成交、佣金与履约费用。</em><button onClick={openNewCard}><Plus size={17} />建立首张成本卡</button></section></>;
    const channelPricing = channelTemplates[orderChannel];
    return <><section className="sub-intro compact"><span>{template.label} · 订单入账</span><h1>记录订单</h1><p>订单会冻结当前渠道佣金、履约费用和目标贡献毛利率，后续修改模板不会重写历史订单。</p></section><form className="record-form" onSubmit={saveOrder}><label>订单号（可选）<input name="orderNo" placeholder="例如：PDD-20260714-001" /></label><label>销售渠道<select value={orderChannel} onChange={(event) => setOrderChannel(event.target.value as OrderChannel)}><option value="platform">平台店</option><option value="live">直播</option><option value="store">到店</option><option value="private">私域</option><option value="other">其他</option></select></label><section className="channel-template-preview"><span><Calculator size={16} />{channelLabel[orderChannel]}默认费用模板</span><b>佣金 {channelPricing.commissionRatePct}% · 履约 ¥{channelPricing.fulfillmentCost} / 件 · 目标贡献毛利 {channelPricing.targetContributionMarginPct}%</b><em>可在成本卡的智能定价页修改并保存此渠道模板。</em></section><label>客户 / 收件人<input name="buyer" placeholder="例如：张女士 / 散客" /></label><label>成交日期<input name="date" type="date" defaultValue={today} /></label><section className="detail-breakdown"><h2>SKU 明细</h2><div className="bom-list">{draftOrderLines.map((line, index) => { const sku = skus.find((item) => item.id === line.skuId); return <div key={`${line.skuId}-${index}`}><span><select value={line.skuId} onChange={(event) => setDraftOrderLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, skuId: event.target.value } : item))}>{skus.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select><em>{sku ? `${yuan(sku.unitPriceFen / 100)} / ${sku.unit} · 成本 ${yuan(sku.unitCostFen / 100)}` : "请选择 SKU"}</em></span><input aria-label="数量" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setDraftOrderLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item))} /><button type="button" onClick={() => setDraftOrderLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="删除 SKU 明细"><Trash2 size={15} /></button></div>; })}</div><button type="button" onClick={() => setDraftOrderLines((current) => [...current, { skuId: skus[0]?.id || "", quantity: 1 }])}><Plus size={16} />添加 SKU</button></section><button type="submit" className="fixed-primary form-save"><Plus size={18} />确认订单并入账</button></form></>;
  }

  function OrderDetailPage() {
    if (!activeOrder) return <div className="empty-state">订单不存在或不属于当前行业。</div>;
    const refundsForOrder = refunds.filter((refund) => refund.orderId === activeOrder.id);
    const gross = activeOrder.lines.reduce((sum, line) => sum + line.unitPriceFen * line.quantity / 100, 0);
    const cogs = activeOrder.lines.reduce((sum, line) => sum + line.unitCostFen * line.quantity / 100, 0);
    const warning = orderWarnings.find((item) => item.orderId === activeOrder.id);
    const pricing = activeOrder.pricing;
    return <><section className="detail-hero"><span>{activeOrder.orderNo} · {activeOrder.status === "paid" ? "已支付" : activeOrder.status === "partially_refunded" ? "部分退款" : "已退款"}</span><h1>{activeOrder.buyer || "散客"}</h1><strong>{yuan(gross)}</strong><p>{activeOrder.occurredAt} · 已售成本 {yuan(cogs)} · 订单毛利 {yuan(gross - cogs)}</p></section><section className={warning ? "order-profit-alert danger" : "order-profit-alert"}><span><Calculator size={18} /></span><div><b>{warning ? (warning.type === "below_break_even" ? "低于保本价预警" : "低于目标毛利预警") : "订单利润核对"}</b><em>{warning ? (warning.type === "below_break_even" ? `订单实收 ${yuan(warning.revenue)}，保本线 ${yuan(warning.breakEvenRevenue)}；扣佣金和履约后预计亏损 ${yuan(Math.abs(warning.contribution))}。` : `贡献毛利率 ${warning.contributionMarginRate}%，低于渠道目标 ${warning.targetMarginRate}%；佣金 ${yuan(warning.commission)}、履约 ${yuan(warning.fulfillment)}。`) : `渠道 ${channelLabel[activeOrder.channel]} · 佣金 ${pricing.commissionRatePct}% · 履约 ¥${pricing.fulfillmentCost}/件 · 目标贡献毛利 ${pricing.targetContributionMarginPct}%`}</em></div></section><section className="detail-breakdown"><h2>SKU 成交明细</h2><div className="bom-list">{activeOrder.lines.map((line) => <div key={line.id}><span><b>{line.skuName}</b><em>{line.skuCode} · {line.quantity}{line.unit} · 已退 {line.refundedQuantity}{line.unit}</em></span><strong>{yuan(line.unitPriceFen * line.quantity / 100)}</strong><button onClick={() => { setOrderLineId(line.id); setSubPage("refundForm"); }} disabled={line.refundedQuantity >= line.quantity} aria-label="登记该SKU退款"><ReceiptText size={15} /></button></div>)}</div></section><section className="detail-breakdown"><h2>退款与退货回收</h2>{!refundsForOrder.length && <div className="empty-state">暂无退款记录。</div>}<div className="report-breakdown">{refundsForOrder.map((refund) => <span key={refund.id}><b>{refund.reason === "quality_issue" ? "质量问题" : refund.reason === "wrong_item" ? "错发漏发" : refund.reason === "customer_cancelled" ? "客户取消" : refund.reason === "logistics_delay" ? "物流延误" : refund.reason === "duplicate_order" ? "重复下单" : "其他"}</b><em>{yuan(refund.refundFen / 100)} · {refund.quantity}件 · {refund.recoveryStatus === "sellable_restocked" ? `可售回收 ${yuan(refund.recoveredCostFen / 100)}` : refund.recoveryStatus === "damaged_disposed" ? "破损报废" : refund.recoveryStatus === "in_transit" ? "退货在途" : "无需退货"}</em></span>)}</div></section></>;
  }

  function RefundFormPage() {
    if (!activeOrder || !activeOrderLine) return <div className="empty-state">请先从订单明细选择要退款的 SKU。</div>;
    const available = activeOrderLine.quantity - activeOrderLine.refundedQuantity;
    return <><section className="sub-intro compact"><span>{activeOrder.orderNo} · {activeOrderLine.skuName}</span><h1>登记退款</h1><p>退款冲减净营收；仅可售回收入库会冲回已售成本，破损报废不冲回。</p></section><form className="record-form" onSubmit={saveRefund}><label>退款数量<input name="quantity" type="number" min="1" max={available} defaultValue={available} /></label><label>退款金额<div className="amount-input"><span>¥</span><input name="refundAmount" type="number" min="0.01" step="0.01" defaultValue={(activeOrderLine.unitPriceFen / 100 * available).toFixed(2)} /></div></label><label>退款手续费（可选）<div className="amount-input"><span>¥</span><input name="refundFee" type="number" min="0" step="0.01" defaultValue="0" /></div></label><label>退款原因<select name="reason"><option value="quality_issue">质量问题</option><option value="wrong_item">错发漏发</option><option value="customer_cancelled">客户取消</option><option value="logistics_delay">物流延误</option><option value="duplicate_order">重复下单</option><option value="other">其他</option></select></label><label>退货回收状态<select name="recoveryStatus"><option value="not_returned">无需退货</option><option value="in_transit">退货在途</option><option value="sellable_restocked">可售回收入库（冲回成本）</option><option value="damaged_disposed">破损报废（不冲回成本）</option></select></label><label>退款日期<input name="date" type="date" defaultValue={today} /></label><button type="submit" className="fixed-primary form-save"><ReceiptText size={18} />确认退款</button></form></>;
  }

  function SkusPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 商品成本</span><h1>SKU 商品成本</h1><p>单位成本来自成本卡；订单销售、退款与可售回收会形成每个 SKU 的真实毛利。调整成本只影响之后创建的订单。</p></section><div className="cost-card-list">{skuMetrics.map((sku) => <div key={sku.id}><span className="healthy"><PackageOpen size={19} /></span><div><b>{sku.name}</b><em>{sku.code} · 售 {sku.soldQuantity}{sku.unit} · 退 {sku.refundedQuantity}{sku.unit}</em><em>净营收 {yuan(sku.netRevenue)} · 已售成本 {yuan(sku.cogs)}</em><form onSubmit={(event) => saveSkuCost(event, sku.id)} className="sku-cost-form"><label>单位成本 ¥<input name="unitCost" type="number" min="0" step="0.01" defaultValue={(sku.unitCostFen / 100).toFixed(2)} /></label><button type="submit">更新</button></form></div><strong>{sku.grossMarginRate}%<small>真实毛利</small></strong></div>)}{!skuMetrics.length && <div className="empty-state">当前行业没有 SKU。请先维护成本卡。</div>}</div></>;
  }

  function RecordsPage() {
    const hasFilter = recordMonth !== "all" || recordFilter !== "all" || Boolean(recordSearch.trim());
    return <><section className="screen-title"><span>经营流水</span><h1>收入、成本，逐笔算清</h1><p>每笔交易都会归入收入、成本或退款，并同步进入经营结果。</p></section><div className="record-filter"><button className={recordFilter === "all" ? "active" : ""} aria-pressed={recordFilter === "all"} onClick={() => setRecordFilter("all")}>全部</button><button className={recordFilter === "expense" ? "active" : ""} aria-pressed={recordFilter === "expense"} onClick={() => setRecordFilter("expense")}>成本 −</button><button className={recordFilter === "income" ? "active" : ""} aria-pressed={recordFilter === "income"} onClick={() => setRecordFilter("income")}>收入 ＋</button><button className={recordFilter === "refund" ? "active" : ""} aria-pressed={recordFilter === "refund"} onClick={() => setRecordFilter("refund")}>退款</button><label className="month-filter"><CalendarDays size={14} /><select aria-label="筛选流水月份" value={recordMonth} onChange={(event) => setRecordMonth(event.target.value)}><option value="all">全部月份</option>{recordMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></label></div><label className="search-field"><Search size={16} /><input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="搜索商户、备注或分类" /></label><div className="result-summary">{hasFilter ? `已找到 ${filteredRecords.length} 笔流水` : `共 ${records.length} 笔流水`}</div><section className="record-list">{groupedRecords.length === 0 && <div className="empty-state">{hasFilter ? `没有匹配“${recordSearch || monthLabel(recordMonth)}”的流水，试试更换月份、类型或关键词。` : "当前行业还没有流水。"}</div>}{groupedRecords.map((group) => <div key={group.date} className="record-group"><h3>{book.dateLabel(group.date)}<span><Highlight value={group.date.replaceAll("-", " / ")} query={recordSearch} /></span></h3>{group.records.map((record) => { const category = categoryByKey.get(record.categoryKey); const isIncome = record.type === "income"; return <button className="record-row" key={record.id} onClick={() => openRecordDetail(record.id)}><span className="record-icon" style={{ color: category?.color, background: `${category?.color || "#087FF5"}18` }}><ReceiptText size={18} /></span><span><b><Highlight value={record.merchant} query={recordSearch} /></b><em><Highlight value={category?.label || "未分类"} query={recordSearch} /> · <Highlight value={record.note || "无备注"} query={recordSearch} />{record.hasAttachment ? " · 有凭证" : ""}</em></span><strong className={isIncome ? "income" : ""}>{isIncome ? "+" : "−"}{yuan(record.amount)}</strong><ChevronRight size={16} /></button>; })}</div>)}</section><button className="floating-add" onClick={openNewRecord}><Plus size={22} />新增成本</button></>;
  }

  function AnalysisPage() {
    const period = analysisPeriod === "current" ? currentPeriod : book.previousPeriod(currentPeriod);
    const periodView = book.getPeriodView(period);
    const periodCost = periodView.totals.totalCost;
    const periodCategories = periodView.totals.categoryTotals;
    const previousView = book.getPeriodView(book.previousPeriod(period));
    const analysisRevenue = periodView.totals.revenue;
    const analysisCogs = analysisRevenue - periodView.totals.grossProfit;
    const analysisExpenses = periodView.totals.grossProfit - periodView.totals.operatingProfit;
    const hasRevenue = analysisRevenue > 0;
    const categoryDeltas = buildCategoryDeltas(periodCategories, previousView.totals.categoryTotals);
    const categoryDeltaByKey = new Map(categoryDeltas.map((item) => [item.key, item]));
    const refundPareto = buildRefundPareto(refunds.filter((refund) => refund.occurredAt.slice(0, 7) === period));
    const maxTrend = Math.max(...trend.map((item) => Math.max(item.cost, item.revenue)), 1);
    const sparseTrend = trend.filter((item) => item.cost > 0 || item.revenue > 0).length < 3;
    return <div className="prototype-analysis"><section className="prototype-analysis-title"><h1>经营分析 · {period.replace("-", " 年 ")} 月</h1></section><section className="analysis-waterfall-card"><div className="analysis-card-head"><h2>利润与成本</h2><div className="segment-control"><button className={analysisPeriod === "current" ? "active" : ""} onClick={() => setAnalysisPeriod("current")}>本月</button><button className={analysisPeriod === "last" ? "active" : ""} onClick={() => setAnalysisPeriod("last")}>上月</button></div></div>{hasRevenue ? <ProfitWaterfall revenue={analysisRevenue} cogs={analysisCogs} expenses={analysisExpenses} profit={periodView.totals.operatingProfit} onSelect={(key) => { if (key === "cogs" || key === "expenses") { setRecordFilter("expense"); setRecordMonth(period); goSub("records"); } else if (key === "revenue") { setRecordFilter("income"); setRecordMonth(period); goSub("records"); } else goSub("reports"); }} /> : <button className="analysis-no-revenue" onClick={openNewRecord}><span>本期尚未录入销售收入</span><b>补录收入后生成利润瀑布图</b><ChevronRight size={16} /></button>}</section><section className={`analysis-trend-card ${sparseTrend ? "sparse" : ""}`}><div className="analysis-card-head"><h2>近 6 月收入与成本</h2><div className="chart-legend"><span><i className="revenue" />收入（¥）</span><span><i className="cost" />成本（¥）</span></div></div><p className="analysis-chart-context">{sparseTrend ? "可用月份较少，先补齐收入与订单以形成连续趋势。" : "收入与成本按自然月归集，可继续下钻核对流水。"}</p><div className="trend-chart">{trend.map((point) => <div key={point.month}><span className="trend-columns"><i style={{ height: `${point.revenue / maxTrend * 100}%` }} /><i style={{ height: `${point.cost / maxTrend * 100}%` }} /></span><em>{point.month.replace("-", "-")}</em></div>)}</div></section><section className="analysis-ranking-card"><div className="analysis-card-head"><h2>成本变化 Top 5</h2><span>较上月</span></div><div className="ranking-card">{periodCategories.slice(0, 5).map((item, index) => { const delta = categoryDeltaByKey.get(item.key); return <button key={item.key} onClick={() => { setRecordSearch(item.label); setRecordMonth(period); goSub("records"); }}><span className="rank">{index + 1}</span><span className="rank-name">{item.label}</span><span className="rank-bar"><b style={{ width: `${item.amount / Math.max(periodCategories[0]?.amount || 1, 1) * 100}%` }} /></span><strong>{yuan(item.amount)}<small className={(delta?.delta || 0) > 0 ? "up" : "down"}>{delta?.deltaRate === null ? "新发生" : `${(delta?.delta || 0) >= 0 ? "↑" : "↓"}${Math.abs(delta?.deltaRate || 0)}%`}</small></strong></button>; })}</div></section></div>;
  }

  function ProfilePage() {
    const priority = homeDecision.priority;
    return <><section className="store-profile"><span className="store-avatar"><IndustryIcon size={24} /></span><div><h1>{template.storeName}</h1><p>{template.descriptor}</p></div><button onClick={() => goSub("industry")}><Settings2 size={18} /></button></section><section className="profile-ledger"><span>本期经营余额</span><b>{yuan(totals.budget)} − {yuan(totals.totalCost)} ＝ <strong>{yuan(totals.budgetRemaining)}</strong></b><em>{totals.budgetRemaining >= 0 ? "预算仍可用，继续按行业成本模型核对。" : "本期预算已超支，建议优先复核高成本分类。"}</em></section>{priority ? <button className="profile-pending" onClick={() => openHomeDecision(priority)}><span><em>本期待处理</em><b>{priority.title}</b></span><small>{priority.action}</small><ChevronRight size={17} /></button> : <section className="profile-pending settled"><span><em>本期待处理</em><b>预算与订单已核对</b></span><small>继续维护行业账本</small><Check size={17} /></section>}<section className="profile-card"><button onClick={() => goSub("industry")}><span><Store size={19} />经营行业</span><strong>{template.label}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("budget")}><span><WalletCards size={19} />预算设置</span><strong>{yuan(totals.budget)}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("reports")}><span><FileText size={19} />成本报表</span><strong>{reports.length} 期<ChevronRight size={16} /></strong></button><button onClick={() => goSub("suppliers")}><span><UsersRound size={19} />供应商</span><strong>{suppliers.length} 家<ChevronRight size={16} /></strong></button><button onClick={() => goSub("categories")}><span><Boxes size={19} />分类管理</span><strong>{categories.length} 类<ChevronRight size={16} /></strong></button></section><section className="profile-tip"><LineChart size={20} /><div><span>模板切换记录</span><p>{book.state.switchLog.length ? `最近一次切换为 ${template.label}，历史账本已归档保留。` : "当前使用行业模板，分类、图表与成本卡均按本行业口径计算。"}</p></div></section></>;
  }

  function IndustryPage() {
    return <><section className="sub-intro"><span>选择你的经营方式</span><h1>一套账本，<br />按行业展开。</h1><p>选择后会自动配置成本模型；历史流水、成本卡和月报仍保持原行业口径。</p></section><div className="industry-picker">{Object.values(industryTemplates).map((item) => { const Icon = iconByIndustry[item.id]; const chosen = item.id === selectedIndustry; return <button key={item.id} className={chosen ? "chosen" : ""} aria-pressed={chosen} onClick={() => setSelectedIndustry(item.id)}><span className="picker-icon"><Icon size={21} /></span><span><b>{item.label}</b><em>{item.descriptor}</em><small>{item.categories.slice(0, 4).map((category) => category.label).join(" ＋ ")} ＝ {item.label}成本模型</small></span>{chosen && <i>已选</i>}</button>; })}</div><div className="switch-note"><CircleAlert size={15} />切换后会创建目标行业分类；历史账本、成本卡和报告不会删除。</div><button className="fixed-primary" onClick={applyIndustry}>使用{industryTemplates[selectedIndustry].label}模板</button></>;
  }

  function RecordPage() {
    const editing = activeRecord;
    return <><section className="sub-intro compact"><span>{template.label} · 经营交易</span><h1>{editing ? "编辑一笔记录" : "记录一笔收支"}</h1><p>收入、退款、销售成本和经营费用会按不同口径归集；退款不会直接计作成本。</p></section><form className="record-form" onSubmit={saveRecord}><label>交易类型<div className="type-switch"><button type="button" className={recordType === "expense" ? "selected" : ""} onClick={() => setRecordType("expense")}>支出</button><button type="button" className={recordType === "income" ? "selected" : ""} onClick={() => setRecordType("income")}>销售收入</button><button type="button" className={recordType === "refund" ? "selected" : ""} onClick={() => setRecordType("refund")}>客户退款</button></div></label><label>{recordType === "refund" ? "退款金额" : "金额"}<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" autoFocus /></div></label>{recordType === "refund" && <><label>退款手续费（可选）<div className="amount-input"><span>¥</span><input name="refundFee" type="number" min="0" step="0.01" defaultValue="0" /></div></label><label>退货可回收成本（可选）<div className="amount-input"><span>¥</span><input name="recovery" type="number" min="0" step="0.01" defaultValue="0" /></div></label></>}<label>日期<input name="date" type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} /></label><label>成本分类<div className="category-chips">{categories.map((item) => <button type="button" key={item.key} className={currentCategoryKey === item.key ? "selected" : ""} onClick={() => setSelectedCategoryKey(item.key)}>{item.label}</button>)}</div></label><label>商户 / 对方<input name="merchant" value={formMerchant} onChange={(event) => setFormMerchant(event.target.value)} placeholder="例如：平台服务商" /></label><label>备注<input name="note" value={formNote} onChange={(event) => setFormNote(event.target.value)} placeholder={`例如：${categories[0]?.hint || "本次交易"}`} /></label><label className="attachment-row"><span><Upload size={16} />凭证状态</span><button type="button" className={hasAttachment ? "attachment-on" : ""} onClick={() => setHasAttachment((value) => !value)}>{hasAttachment ? "已附凭证" : "添加凭证"}</button></label><button type="submit" className="fixed-primary form-save"><Plus size={18} />{editing ? "保存修改" : "保存记录"}</button></form></>;
  }

  function RecordDetailPage() {
    if (!activeRecord) return <div className="empty-state">记录不存在或已被删除。</div>;
    const category = categoryByKey.get(activeRecord.categoryKey);
    return <><section className="detail-hero"><span className="detail-dot" style={{ background: category?.color || "#1677FF" }} /><span>{activeRecord.type === "income" ? "收入记录" : activeRecord.type === "refund" ? "退款记录" : "支出记录"}</span><h1>{activeRecord.merchant}</h1><strong>{activeRecord.type === "income" ? "+" : "-"}{yuan(activeRecord.amount)}</strong><p>{activeRecord.date} · {category?.label || "未分类"} · {activeRecord.status === "accounted" ? "已核算" : activeRecord.status === "pending" ? "待核算" : "异常"}</p></section><section className="detail-breakdown"><h2>记录说明</h2><div><span className="tip-icon"><ReceiptText size={18} /></span><p>{activeRecord.note || "未填写备注"}{activeRecord.hasAttachment ? " · 已附凭证" : " · 未附凭证"}</p></div><button onClick={editRecord}>编辑记录 <Pencil size={16} /></button><button className="danger-button" onClick={deleteRecord}>删除记录 <Trash2 size={16} /></button></section></>;
  }

  function CardsPage() {
    const visibleCards = cards.filter((card) => card.name.toLowerCase().includes(cardSearch.toLowerCase()) || card.kind.toLowerCase().includes(cardSearch.toLowerCase()));
    const watchCount = cards.filter((card) => card.status === "risk" || card.status === "attention").length;
    return <div className="prototype-products"><section className="products-page-title"><h1>商品成本</h1><p>清晰掌握商品成本变化，提升单件利润</p></section><div className="product-tabs"><button className="active">全部商品 <span>{cards.length}</span></button><button>关注 <span>{watchCount}</span></button><button><ChevronDown size={15} />按成本上升</button></div><label className="search-field product-search"><Search size={16} /><input value={cardSearch} onChange={(event) => setCardSearch(event.target.value)} placeholder={`搜索${template.entityLabel}名称或类型`} /></label><div className="product-cost-list">{visibleCards.map((card) => { const value = calcCard(card); const maxHistory = Math.max(...card.history, value.cost, 1); const unitProfit = card.salePrice - value.cost; return <button key={card.id} onClick={() => openCard(card.id)}><div className="product-card-head"><span><PackageOpen size={19} /></span><div><b>{card.name}</b><em>{card.kind || template.entityLabel}　|　SKU-{card.id.slice(-4)}</em></div><i className={card.status === "risk" ? "risk" : card.status === "attention" ? "attention" : "healthy"}>{card.status === "risk" ? "需复核" : card.status === "attention" ? "成本上升" : "稳定"}</i></div><div className="product-kpis"><label><em>单位成本</em><b>{yuan(value.cost)}</b></label><label><em>售价</em><b>{card.salePrice > 0 ? yuan(card.salePrice) : "未填写"}</b></label><label><em>单件利润</em><b className={unitProfit < 0 ? "negative" : ""}>{card.salePrice > 0 ? yuan(unitProfit) : "—"}</b></label></div><div className="product-trend-label">单位成本趋势（近6期）</div><div className="product-microtrend">{card.history.map((amount, index) => <span key={`${amount}-${index}`}><b>{amount.toFixed(1)}</b><i style={{ height: `${Math.max(8, amount / maxHistory * 100)}%` }} /><em>{index + 2}月</em></span>)}</div><div className="product-actions"><span><Boxes size={17} />成本构成 <b>{card.items.length}项</b><ChevronRight size={15} /></span><span><Calculator size={17} />智能定价 <ChevronRight size={15} /></span></div></button>; })}{!visibleCards.length && <div className="empty-state">没有匹配的成本卡。</div>}</div><button className="fixed-primary list-primary" onClick={openNewCard}><Plus size={18} />新增{template.entityLabel}成本卡</button></div>;
  }

  function CardDetailPage() {
    if (!activeCard || !cardCost) return <div className="empty-state">成本卡不存在或已归档。</div>;
    const max = Math.max(...activeCard.history, cardCost.cost, 1);
    const linkedSku = skuMetrics.find((sku) => sku.cardId === activeCard.id);
    const unitProfit = activeCard.salePrice - cardCost.cost;
    return <><section className="sub-intro compact"><span>{template.entityLabel} · 成本核算</span><h1>{activeCard.name}</h1><p>{activeCard.kind} · 先看成本构成，再判断售价与利润是否合理。</p></section><section className="cost-formula"><span>成本构成</span><div><b>{template.formulaLabel} {yuan(cardCost.material)}</b><i>＋</i><b>人工 {yuan(activeCard.labor)}</b><i>＋</i><b>分摊 {yuan(activeCard.overhead)}</b><i>＝</i><strong>{yuan(cardCost.cost)} / {activeCard.unit}</strong></div></section>{activeCard.salePrice > 0 ? <EquationResult firstLabel="当前售价" firstValue={yuan(activeCard.salePrice)} secondLabel="单位成本" secondValue={yuan(cardCost.cost)} resultLabel="单件利润" resultValue={yuan(unitProfit)} detail={`毛利率 ${cardCost.marginRate}% · ${unitProfit >= 0 ? "当前售价可覆盖单位成本" : "当前售价低于单位成本，请优先调整"}`} /> : <button className="pricing-empty-tip" onClick={openPricing}><Calculator size={18} /><span><b>尚未填写售价，毛利率无法计算</b><em>使用智能测算定价，先设定目标毛利再一键写入。</em></span><ChevronRight size={16} /></button>}<section className="detail-actions"><button onClick={editCard}><Pencil size={16} />编辑成本</button><button onClick={openPricing}><Calculator size={16} />测算定价</button><button className="danger" onClick={deleteCard}><Trash2 size={16} />删除</button></section>{linkedSku && <section className="detail-breakdown"><h2>订单 SKU 实绩</h2><div><span className="tip-icon"><ShoppingCart size={18} /></span><p>售出 {linkedSku.soldQuantity}{linkedSku.unit}，退款 {linkedSku.refundedQuantity}{linkedSku.unit}，净营收 {yuan(linkedSku.netRevenue)}，真实毛利率 {linkedSku.grossMarginRate}% 。</p></div><button onClick={() => goSub("skus")}>查看 SKU 经营 <ChevronRight size={16} /></button></section>}<section className="detail-breakdown"><h2>{template.formulaLabel}明细</h2><div className="bom-list">{activeCard.items.map((item) => <div key={item.id}><span><b>{item.name}</b><em>{item.spec || "规格待补充"} · {item.quantity}</em></span><strong>{yuan(item.amount)}</strong><span className="bom-row-actions"><button onClick={() => { setBomItemId(item.id); goSub("bomForm"); }} aria-label="编辑成本项"><Pencil size={14} /></button><button onClick={() => { book.removeBomItem(activeCard.id, item.id); notify("已删除成本项，单位成本和 SKU 已同步重算"); }} aria-label="删除成本项"><Trash2 size={15} /></button></span></div>)}</div><button onClick={() => { setBomItemId(null); goSub("bomForm"); }}>＋ 添加{template.formulaLabel}项</button></section><section className="detail-breakdown"><h2>近 6 月单位成本趋势</h2><div className="weekly-bars cost-history">{activeCard.history.map((amount, index) => <span key={`${amount}-${index}`}><i style={{ height: `${amount / max * 100}%`, background: index === activeCard.history.length - 1 ? "#087FF5" : "#cfe2ff" }} /><em>{index + 2} 月</em></span>)}</div></section></>;
  }

  function PricingPage() {
    if (!activeCard || !cardCost) return <div className="empty-state">请先选择一张成本卡。</div>;
    const base = { unitCost: cardCost.cost, platformRatePct: pricingPlatformRate, fulfillmentCost: pricingFulfillmentCost, roundingStep: pricingRoundingStep };
    const breakEven = breakEvenPrice(base.unitCost, base.platformRatePct, base.fulfillmentCost, base.roundingStep);
    const suggested = quotePrice({ ...base, targetContributionMarginPct: pricingTargetMargin });
    const plans = [30, 40, 50].map((target) => ({ target, quote: quotePrice({ ...base, targetContributionMarginPct: target }) }));
    const switchPricingChannel = (channel: OrderChannel) => { const config = channelTemplates[channel]; setPricingChannel(channel); setPricingPlatformRate(config.commissionRatePct); setPricingFulfillmentCost(config.fulfillmentCost); setPricingTargetMargin(config.targetContributionMarginPct); setPricingRoundingStep(config.roundingStep); };
    const simulatePrice = (price: number) => { const contribution = Number((price * (1 - pricingPlatformRate / 100) - cardCost.cost - pricingFulfillmentCost).toFixed(2)); return { price, contribution, margin: price > 0 ? Number((contribution / price * 100).toFixed(1)) : 0 }; };
    const promo = suggested.available ? simulatePrice(Number((suggested.price * (1 - promotionDiscount / 100)).toFixed(2))) : null;
    const competitorPrices = [competitorLow, competitorHigh].filter((value) => value > 0).sort((a, b) => a - b).map(simulatePrice);
    const writePrice = (price: number) => { if (!Number.isFinite(price) || price <= 0) return; book.updateCard(activeCard.id, { salePrice: price }); notify(`建议售价 ${yuan(price)} 已写入成本卡，并同步后续订单 SKU`); setSubPage("cardDetail"); };
    return <><section className="sub-intro compact"><span>{activeCard.name} · 智能定价</span><h1>先算保本，再定售价</h1><p>以单位完全成本为基数，扣除渠道费率与单件履约费用后，反推目标贡献毛利率所需售价。</p></section><section className="pricing-base"><span>当前单位完全成本</span><strong>{yuan(cardCost.cost)} / {activeCard.unit}</strong><em>{template.formulaLabel} {yuan(cardCost.material)} + 人工 {yuan(activeCard.labor)} + 分摊 {yuan(activeCard.overhead)}</em></section><section className="record-form compact-form pricing-inputs"><label>销售渠道<select value={pricingChannel} onChange={(event) => switchPricingChannel(event.target.value as OrderChannel)}>{(Object.keys(channelTemplates) as OrderChannel[]).map((channel) => <option key={channel} value={channel}>{channelLabel[channel]}</option>)}</select></label><div className="template-head"><span><Calculator size={15} />{channelLabel[pricingChannel]}费用模板</span><button type="button" onClick={() => { book.updateChannelPricing(pricingChannel, { commissionRatePct: pricingPlatformRate, fulfillmentCost: pricingFulfillmentCost, targetContributionMarginPct: pricingTargetMargin, roundingStep: pricingRoundingStep }); notify(`${channelLabel[pricingChannel]}默认费用模板已保存，新订单将自动使用`); }}>保存模板</button></div><label>渠道综合费率<input type="number" min="0" max="99" step="0.1" value={pricingPlatformRate} onChange={(event) => setPricingPlatformRate(Number(event.target.value) || 0)} /><small>按订单实收比例扣除；非平台渠道可填 0%</small></label><label>单件履约费用<div className="amount-input"><span>¥</span><input type="number" min="0" step="0.01" value={pricingFulfillmentCost} onChange={(event) => setPricingFulfillmentCost(Number(event.target.value) || 0)} /></div><small>例如额外运费、支付手续费或单件售后准备金</small></label><label>目标贡献毛利率<input type="number" min="0" max="99" step="1" value={pricingTargetMargin} onChange={(event) => setPricingTargetMargin(Number(event.target.value) || 0)} /></label><label>价格取整步长<select value={pricingRoundingStep} onChange={(event) => setPricingRoundingStep(Number(event.target.value))}><option value="0.1">按 ¥0.1 向上取整</option><option value="0.5">按 ¥0.5 向上取整</option><option value="1">按 ¥1 向上取整</option><option value="5">按 ¥5 向上取整</option></select></label></section><section className="pricing-quote"><span>保本售价</span><strong>{breakEven.available ? yuan(breakEven.price) : "无法计算"}</strong><em>{breakEven.available ? `扣除渠道费用后贡献毛利 ${breakEven.contributionMarginPct}%` : breakEven.reason}</em></section>{suggested.available ? <section className="pricing-recommend"><span>建议售价 · 目标贡献毛利 {pricingTargetMargin}%</span><strong>{yuan(suggested.price)}</strong><p>原始测算 {yuan(suggested.rawPrice)}，按规则向上取整；每{activeCard.unit}贡献 {yuan(suggested.contributionPerUnit)}，实际贡献毛利 {suggested.contributionMarginPct}% 。</p><button onClick={() => writePrice(suggested.price)}><Calculator size={17} />一键写入售价</button></section> : <div className="pricing-error"><CircleAlert size={18} />{suggested.reason}</div>}<section className="detail-breakdown pricing-simulator"><h2>竞品与促销利润模拟</h2><div className="form-two-col"><label>竞品低价<input type="number" min="0" step="0.01" value={competitorLow || ""} onChange={(event) => setCompetitorLow(Number(event.target.value) || 0)} placeholder="例如：59" /></label><label>竞品高价<input type="number" min="0" step="0.01" value={competitorHigh || ""} onChange={(event) => setCompetitorHigh(Number(event.target.value) || 0)} placeholder="例如：79" /></label><label>促销折扣<input type="number" min="0" max="99" step="1" value={promotionDiscount || ""} onChange={(event) => setPromotionDiscount(Number(event.target.value) || 0)} placeholder="例如：10" /></label><label>促销后售价<input readOnly value={suggested.available && promo ? yuan(promo.price) : "—"} /></label></div>{suggested.available && promo && <div className={promo.contribution < 0 ? "sim-result danger" : promo.margin < pricingTargetMargin ? "sim-result warning" : "sim-result"}><b>促销后贡献毛利 {promo.margin}%</b><em>单件贡献 {yuan(promo.contribution)} {promo.contribution < 0 ? "· 低于保本价" : promo.margin < pricingTargetMargin ? `· 低于 ${pricingTargetMargin}% 目标` : "· 达到目标"}</em></div>}{competitorPrices.length > 0 && <div className="competitor-results">{competitorPrices.map((result) => <span key={result.price}><b>竞品价 {yuan(result.price)}</b><em>贡献毛利 {result.margin}% · 单件 {yuan(result.contribution)}</em></span>)}</div>}</section><section className="detail-breakdown pricing-plans"><h2>不同目标毛利的售价档位</h2><div className="report-breakdown">{plans.map(({ target, quote }) => <button key={target} disabled={!quote.available} onClick={() => quote.available && writePrice(quote.price)}><span><b>{target}% 目标贡献毛利</b><em>{quote.available ? `预计单件贡献 ${yuan(quote.contributionPerUnit)}` : quote.reason}</em></span><strong>{quote.available ? yuan(quote.price) : "—"}</strong></button>)}</div></section><section className="pricing-note"><CircleAlert size={16} /><p>该测算是定价辅助工具，不替代市场需求、促销折扣、税费或实际平台结算核对；价格写入仅影响后续订单，历史订单售价和成本快照不会改写。</p></section></>;
  }

  function CardFormPage() {
    const editing = activeCard;
    const visibleMaterials = draftMaterials.length ? draftMaterials : [{ name: "直接材料", spec: "", quantity: `1 ${template.unitLabel}`, amount: 0 }];
    return <><section className="sub-intro compact"><span>{template.label} · {template.entityLabel}定价</span><h1>{editing ? `编辑${template.entityLabel}` : `新增${template.entityLabel}`}</h1><p>可连续添加多项材料。保存后会自动创建或同步 SKU；更新只应用于之后创建的订单，历史订单保留成交快照。</p></section><form className="record-form" onSubmit={saveCard}><label>{template.entityLabel}名称<input name="name" defaultValue={editing?.name || ""} placeholder={`例如：${template.entityLabel}名称`} autoFocus /></label><label>类型 / 标签<input name="kind" defaultValue={editing?.kind || ""} placeholder="例如：平台 SKU / 热菜 / 服务项目" /></label><label>计量单位<input name="unit" defaultValue={editing?.unit || template.unitLabel} placeholder={`例如：${template.unitLabel}`} /></label><label>销售单价<div className="amount-input"><span>¥</span><input name="salePrice" type="number" min="0.01" step="0.01" defaultValue={editing?.salePrice || ""} /></div></label><section className="form-section material-editor"><span>基础材料清单</span><div className="material-list">{visibleMaterials.map((material, index) => <div className="material-row" key={`${index}-${material.name}`}><div className="material-row-head"><b>材料 {index + 1}</b>{visibleMaterials.length > 1 && <button type="button" onClick={() => setDraftMaterials((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} />删除</button>}</div><div className="form-two-col"><label>名称<input value={material.name} onChange={(event) => setDraftMaterials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="例如：包装盒" /></label><label>金额<input type="number" min="0" step="0.01" value={material.amount} onChange={(event) => setDraftMaterials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(event.target.value) } : item))} placeholder="0.00" /></label><label>规格<input value={material.spec} onChange={(event) => setDraftMaterials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, spec: event.target.value } : item))} placeholder="例如：500g" /></label><label>数量<input value={material.quantity} onChange={(event) => setDraftMaterials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} placeholder="例如：1 件" /></label></div></div>)}</div><button className="add-material" type="button" onClick={() => setDraftMaterials((current) => [...(current.length ? current : visibleMaterials), { name: "", spec: "", quantity: `1 ${template.unitLabel}`, amount: 0 }])}><Plus size={16} />新增材料</button></section><section className="form-section"><span>其他单位成本</span><div className="form-two-col"><label>人工分摊<input name="labor" type="number" min="0" step="0.01" defaultValue={editing?.labor ?? "0"} /></label><label>固定分摊<input name="overhead" type="number" min="0" step="0.01" defaultValue={editing?.overhead ?? "0"} /></label></div></section><button className="fixed-primary form-save" type="submit"><Plus size={18} />{editing ? "保存成本卡" : "创建成本卡与 SKU"}</button></form></>;
  }

  function BomFormPage() {
    return <><section className="sub-intro compact"><span>{activeCard?.name || template.entityLabel} · {template.formulaLabel}</span><h1>{activeBomItem ? "编辑成本项" : "添加成本项"}</h1><p>保存后会立刻重算单位成本、毛利率和后续订单使用的 SKU 成本。</p></section><form className="record-form" onSubmit={saveBomItem}><label>成本项名称<input name="name" defaultValue={activeBomItem?.name || ""} placeholder="例如：包装盒 / 服务耗材" /></label><label>规格<input name="spec" defaultValue={activeBomItem?.spec || ""} placeholder="例如：500g / 单次" /></label><label>数量<input name="quantity" defaultValue={activeBomItem?.quantity || "1 份"} placeholder="例如：1 份" /></label><label>金额<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" defaultValue={activeBomItem?.amount ?? ""} placeholder="0.00" /></div></label><button className="fixed-primary form-save" type="submit"><Plus size={18} />{activeBomItem ? "保存并重算" : "加入并重算"}</button></form></>;
  }

  function BudgetPage() {
    const budgetBurn = buildBudgetBurn({ budget: totals.budget, used: totals.totalCost, dayOfMonth: currentDay, daysInMonth: new Date(periodYear, periodMonth, 0).getDate() });
    const forecastLabel = budgetBurn.state === "over" ? `月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}` : budgetBurn.state === "risk" ? `月末预计超预算 ${yuan(Math.max(0, budgetBurn.forecast - budgetBurn.budget))}` : `月末预计结余 ${yuan(Math.max(0, budgetBurn.budget - budgetBurn.forecast))}`;
    return <div className="prototype-budget"><section className="prototype-budget-title"><h1>预算管理 · {currentPeriod.replace("-", " 年 ")} 月</h1></section><BudgetRing burn={budgetBurn} onClick={() => notify("已按当前入账成本刷新预算预测")} /><div className={budgetBurn.state === "healthy" ? "budget-alert normal" : "budget-alert"}><CircleAlert size={17} />{forecastLabel}</div><section className="budget-forecast"><div className="budget-forecast-head"><span>月末预计趋势</span><CircleAlert size={15} /></div><div className="budget-forecast-line"><i className="budget-line-spent" /><i className="budget-line-projection" /><small className="budget-line-target">预算线 {yuan(budgetBurn.budget)}</small><b className="budget-line-current">{yuan(budgetBurn.used)}</b><b className="budget-line-forecast">{yuan(budgetBurn.forecast)}</b></div><div className="budget-forecast-labels"><span>今天 {String(currentDay).padStart(2, "0")} 日</span><span>月末 {new Date(periodYear, periodMonth, 0).getDate()} 日</span></div></section><form className="budget-form-card" onSubmit={saveBudget}><div><span>月度预算</span><b>{yuan(totals.budget)}</b><ChevronRight size={17} /></div><label className="sr-only">月度预算<input name="budget" type="number" min="1" defaultValue={totals.budget} /></label><button type="submit">调整预算</button></form></div>;
  }

  function ReportsPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 月度经营</span><h1>成本报表</h1><p>草稿报表实时聚合交易；封存报表保留当期行业与分类快照。</p></section><div className="report-list">{reports.map((report) => <button key={report.id} onClick={() => openReport(report.id)}><span><FileText size={20} /></span><div><b>{report.month.replace("-", " 年 ")} 月经营报表</b><em>{report.status === "closed" ? "已封存" : "实时草稿"} · 支出 {yuan(report.cost)} · 净营收 {yuan(report.revenue)}</em></div><strong>{report.grossMarginRate}%<small>毛利率</small></strong><ChevronRight size={16} /></button>)}</div></>;
  }

  function ReportDetailPage() {
    if (!activeReport) return <div className="empty-state">报表不存在。</div>;
    const reportOrders = orders.filter((order) => order.occurredAt.slice(0, 7) === activeReport.month);
    const reportRefunds = refunds.filter((refund) => refund.occurredAt.slice(0, 7) === activeReport.month);
    return <><section className="detail-hero"><span>{template.label} · {activeReport.status === "closed" ? "已封存快照" : "实时草稿"}</span><h1>{activeReport.month.replace("-", " 年 ")} 月报</h1><strong>{yuan(activeReport.cost)}</strong><p>净营收 {yuan(activeReport.revenue)} · 毛利 {yuan(activeReport.margin)} · 毛利率 {activeReport.grossMarginRate}% · 经营利润率 {activeReport.operatingMarginRate}%</p></section><section className="detail-breakdown"><h2>订单与退款</h2><div><span className="tip-icon"><ShoppingCart size={18} /></span><p>本期已纳入 {reportOrders.length} 笔订单、{reportRefunds.length} 笔 SKU 退款；订单销售和已售成本已并入收入与成本口径。</p></div><button onClick={() => goSub("orders")}>查看订单账本 <ChevronRight size={16} /></button></section><section className="detail-breakdown"><h2>分类明细</h2><div className="report-breakdown">{activeReport.snapshot.map((item) => <span key={item.key}><b>{item.label}</b><em>{yuan(item.amount)} · {item.pct}%</em></span>)}</div>{activeReport.status === "draft" ? <button onClick={() => { book.closeReport(activeReport.month); notify("月报已封存；之后的流水不会改写该快照"); }}>封存本月口径 <FileText size={16} /></button> : <button onClick={() => notify("报表导出将在云端版本生成")}>导出报表 <FileText size={16} /></button>}</section></>;
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
    return <>
      <section className="sub-intro compact"><span>{template.label} · 采购协同</span><h1>供应商</h1><p>供应商按行业范围关联；共享供应商可在多个行业账本中复用。</p></section>
      <div className="supplier-list">{suppliers.map((supplier) => {
        const category = categoryByKey.get(supplier.categoryKey);
        return <div key={supplier.id}>
          <span>{supplier.name.slice(0, 1)}</span>
          <section><b>{supplier.name}</b><em>{category?.label || "未分类"} · {supplier.contact || "未设置联系人"}</em></section>
          <strong>{yuan(supplier.spend)}<small>{supplier.orders} 笔</small></strong>
          <button onClick={() => deleteSupplier(supplier.id, supplier.name)} aria-label="删除供应商"><Trash2 size={16} /></button>
        </div>;
      })}</div>
      <button className="fixed-primary" onClick={() => goSub("supplierForm")}><Plus size={18} />新增供应商</button>
    </>;
  }

  function SupplierFormPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 供应商信息</span><h1>新增供应商</h1><p>供应商会关联到当前行业；后续可在管理页设置为共享供应商。</p></section><form className="record-form" onSubmit={saveSupplier}><label>供应商名称<input name="name" placeholder="例如：优选食材供应" /></label><label>联系人<input name="contact" placeholder="例如：李经理" /></label><label>默认分类<select name="categoryKey">{categories.map((category) => <option value={category.key} key={category.key}>{category.label}</option>)}</select></label><button type="submit" className="fixed-primary form-save"><Plus size={18} />保存供应商</button></form></>;
  }

  function CategoriesPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 账本口径</span><h1>分类管理</h1><p>分类会同步影响记账归集、成本构成、报表和隐性成本模型。</p></section><div className="category-manage-list">{categories.map((category) => <div key={category.id}><i style={{ background: category.color }} /><span><b>{category.label}</b><em>{category.hint}</em></span><button onClick={() => deleteCategory(category.id, category.label)} aria-label={`删除分类 ${category.label}`}><Trash2 size={16} /></button></div>)}</div><button className="fixed-primary" onClick={() => goSub("categoryForm")}><Plus size={18} />新增分类</button></>;
  }

  function CategoryFormPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 分类口径</span><h1>新增分类</h1><p>新分类只作用于当前行业账本，历史行业分类不受影响。</p></section><form className="record-form" onSubmit={saveCategory}><label>分类名称<input name="label" placeholder="例如：内容制作" /></label><label>分类颜色<select name="color"><option value="#1677FF">品牌蓝</option><option value="#12B76A">绿色</option><option value="#F79009">橙色</option><option value="#7F56D9">紫色</option><option value="#F04438">红色</option></select></label><button type="submit" className="fixed-primary form-save"><Plus size={18} />保存分类</button></form></>;
  }

  function NotificationsPage() {
    return <div className="notification-center"><section className="notification-summary"><span><Bell size={17} />经营提醒</span><b>{unreadNotificationCount ? `${unreadNotificationCount} 条待查看` : "已全部查看"}</b><button onClick={() => setReadNotificationIds(notificationItems.map((item) => item.id))}>{unreadNotificationCount ? "全部标为已读" : "全部已读"}</button></section><section className="notification-list">{notificationItems.map((item) => { const read = readNotificationIds.includes(item.id); return <button key={item.id} className={`${item.tone}${read ? " read" : ""}`} onClick={() => openNotificationTarget(item)}><span className="notification-symbol">{item.tone === "risk" ? "!" : item.tone === "attention" ? "·" : "＝"}</span><div><span className="notification-impact">{notificationImpact(item)}</span><b>{item.title}</b><em>{item.copy}</em><small>＝ {item.action}</small></div><ChevronRight size={18} /></button>; })}</section></div>;
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
    if (tab === "orders") return OrdersPage();
    if (tab === "cards") return CardsPage();
    if (tab === "analysis") return AnalysisPage();
    if (tab === "profile") return ProfilePage();
    return HomePage();
  }

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [{ id: "home", label: "经营", icon: HomeIcon }, { id: "orders", label: "订单", icon: ReceiptText }, { id: "cards", label: "商品", icon: PackageOpen }, { id: "analysis", label: "分析", icon: BarChart3 }, { id: "profile", label: "我的", icon: WalletCards }];
  return <div className="mobile-shell"><div className="app-frame">{renderHeader()}<main className={isSub ? "app-content sub-content" : "app-content"}>{renderContent()}</main>{!isSub && <nav className="tabbar" aria-label="主导航">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setRecordSearch(""); }}><Icon size={21} /><span>{label}</span></button>)}</nav>}{toast && <div className="app-toast" role="status" aria-live="polite">{toast}</div>}</div></div>;
}
