/**
 * 移动账本 App：四个一级入口与可返回的业务页面栈。
 * 所有金额、分类、流水、成本卡与图表均通过统一行业化 Store 读取和更新。
 * 视觉规范：数字蓝 #1677FF、深海军蓝 #0b1836、冷白背景与紧凑圆角卡片，优先保证单手操作路径。
 */
import { FormEvent, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  LineChart,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Store,
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

type TabId = "home" | "records" | "analysis" | "profile";
type SubPage = "industry" | "record" | "recordDetail" | "cards" | "cardDetail" | "bomForm" | "budget" | "reports" | "reportDetail" | "suppliers" | "supplierForm" | "categories" | "categoryForm" | null;
type RecordFilter = "all" | RecordType;

const format = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const yuan = (amount: number) => `¥${format.format(Math.round(amount))}`;
const iconByIndustry: Record<IndustryId, LucideIcon> = { canteen: Utensils, retail: ShoppingBag, ecommerce: ShoppingCart, beauty: ClipboardList, stall: Store };
const today = "2026-07-14";

export default function Home() {
  const book = useCostBook();
  const [tab, setTab] = useState<TabId>("home");
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>(book.activeIndustryId);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [recordSearch, setRecordSearch] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formMerchant, setFormMerchant] = useState("");
  const [formNote, setFormNote] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [analysisPeriod, setAnalysisPeriod] = useState<"current" | "last">("current");
  const [hasAttachment, setHasAttachment] = useState(false);

  const { template, categories, records, cards, suppliers, reports, totals, trend, hiddenCosts, currentPeriod } = book;
  const IndustryIcon = iconByIndustry[book.activeIndustryId];
  const isSub = subPage !== null;
  const categoryByKey = useMemo(() => new Map(categories.map((category) => [category.key, category])), [categories]);
  const activeRecord = records.find((record) => record.id === recordId) ?? null;
  const activeCard = cards.find((card) => card.id === cardId) ?? null;
  const activeReport = reports.find((report) => report.id === reportId) ?? null;
  const cardCost = activeCard ? calcCard(activeCard) : null;
  const currentCategoryKey = selectedCategoryKey || categories[0]?.key || "";

  const filteredRecords = records.filter((record) => {
    const search = recordSearch.trim().toLowerCase();
    const matchesType = recordFilter === "all" || record.type === recordFilter;
    const category = categoryByKey.get(record.categoryKey)?.label || "";
    const matchesSearch = !search || [record.merchant, record.note, category, record.date].join(" ").toLowerCase().includes(search);
    return matchesType && matchesSearch;
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
  function goBack() {
    if (subPage === "bomForm") { setSubPage("cardDetail"); return; }
    if (subPage === "recordDetail") { setSubPage(null); setTab("records"); return; }
    if (subPage === "cardDetail") { setSubPage("cards"); return; }
    if (subPage === "reportDetail") { setSubPage("reports"); return; }
    if (subPage === "supplierForm") { setSubPage("suppliers"); return; }
    if (subPage === "categoryForm") { setSubPage("categories"); return; }
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
  function openReport(id: string) { setReportId(id); goSub("reportDetail"); }

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
    setSubPage(null);
    setTab("records");
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
    setSubPage(null);
    setTab("records");
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
    book.addBomItem(activeCard.id, { name, amount, spec: String(data.get("spec") || ""), quantity: String(data.get("quantity") || "1 份") });
    notify("成本项已加入，单位成本已重算");
    setSubPage("cardDetail");
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
    const titles: Record<Exclude<SubPage, null>, string> = { industry: "切换行业", record: recordId ? "编辑记录" : "记一笔", recordDetail: "流水详情", cards: `${template.entityLabel}成本卡`, cardDetail: `${template.entityLabel}成本详情`, bomForm: `添加${template.formulaLabel}项`, budget: "预算管理", reports: "成本报表", reportDetail: "报表详情", suppliers: "供应商", supplierForm: "新增供应商", categories: "分类管理", categoryForm: "新增分类" };
    if (isSub) return <header className="page-header sub-header"><button className="back-button" onClick={goBack} aria-label="返回"><ArrowLeft size={21} /></button><strong>{titles[subPage]}</strong><span /></header>;
    return <header className="page-header"><div className="brand-mini"><img src="/manus-storage/suandeqing-brand-mark_4e1ee068.png" alt="算得清" /><span><strong>算得清</strong><em>{template.label}成本账本</em></span></div><button className="header-icon" onClick={() => notify("今日暂无新的提醒")} aria-label="经营提醒"><Bell size={20} /><i /></button></header>;
  }

  function HomePage() {
    return <>
      <section className="dashboard-kicker"><span>工作台 · {currentPeriod.replace("-", " 年 ")} 月</span><h1><IndustryIcon size={20} />{template.label}经营仪表盘</h1><em>{template.storeName} · 真实期间交易口径</em></section>
      <section className="summary-card"><div className="summary-head"><span><IndustryIcon size={16} />{template.label} · 经营总览</span><button onClick={() => goSub("industry")}>行业模板 <ChevronRight size={14} /></button></div><div className="summary-main"><div><span>本月净营收</span><strong>{yuan(totals.revenue)}</strong><em>退款冲减 <b>{yuan(totals.refunds)}</b></em></div><img src="/manus-storage/mobile-cost-dashboard_efecf7a5.png" alt="成本数据插画" /></div><div className="summary-grid"><span><b>{totals.budgetUsed.toFixed(1)}%</b>经营预算已用</span><span><b>{totals.grossMarginRate}%</b>毛利率</span><span><b>{yuan(totals.budgetRemaining)}</b>{totals.budgetRemaining >= 0 ? "预算余额" : "预算超支"}</span></div><div className="summary-risk"><CircleAlert size={14} /><span>经营利润率 {totals.operatingMarginRate}%</span><strong>{template.risk}</strong></div></section>
      {book.state.workspace.dataMode === "legacy_review" && totals.grossSales === 0 && <button className="risk-card" onClick={openNewRecord}><span className="risk-symbol"><CircleAlert size={19} /></span><span><em>账本升级待复核</em><strong>尚未确认销售收入，净营收暂按 ¥0 计算</strong><small>历史模板营收未自动迁入，避免重复确认；请从“记一笔”补录销售日结。</small></span><ChevronRight size={18} /></button>}
      {!(book.state.workspace.dataMode === "legacy_review" && totals.grossSales === 0) && <button className="risk-card" onClick={() => setTab("analysis")}><span className="risk-symbol"><CircleAlert size={19} /></span><span><em>优先风险</em><strong>{template.risk}</strong><small>{template.riskNote}</small></span><ChevronRight size={18} /></button>}
      <section className="section-block"><div className="section-title"><div><span>今日经营</span><h2>快捷查看</h2></div><button onClick={() => setTab("analysis")}>全部 <ChevronRight size={15} /></button></div><div className="quick-grid"><button onClick={openNewRecord}><span className="quick-icon blue"><Plus size={20} /></span><b>记一笔</b><em>收入、支出均可记</em></button><button onClick={() => goSub("budget")}><span className="quick-icon green"><WalletCards size={20} /></span><b>看预算</b><em>本月占用 {totals.budgetUsed.toFixed(0)}%</em></button><button onClick={() => goSub("cards")}><span className="quick-icon orange"><ClipboardList size={20} /></span><b>成本卡</b><em>{template.entityLabel}成本与毛利</em></button></div></section>
      <section className="section-block"><div className="section-title"><div><span>成本构成</span><h2>本月花在哪</h2></div><button onClick={() => setTab("analysis")}>分析 <ChevronRight size={15} /></button></div><div className="category-card">{totals.categoryTotals.slice(0, 5).map((category) => <button className="category-cell" key={category.key} onClick={() => { setRecordFilter("all"); setRecordSearch(category.label); setTab("records"); }}><span className="category-dot" style={{ background: category.color }} /><span className="category-info"><b>{category.label}</b><em>{category.hint}</em></span><strong>{yuan(category.amount)}</strong><ChevronRight size={15} /></button>)}</div></section>
      <section className="mini-trend-card"><div><span>近 6 月真实经营趋势</span><strong>{trend.at(-1)?.marginRate ?? 0}% 毛利率</strong></div><div className="mini-bars">{trend.map((point, index) => <i key={point.month} style={{ height: `${Math.max(8, point.cost / Math.max(...trend.map((item) => item.revenue), 1) * 100)}%`, background: index === trend.length - 1 ? "#1677FF" : "#bddbff" }} />)}</div><button onClick={() => setTab("analysis")}><LineChart size={15} />查看趋势</button></section>
    </>;
  }

  function RecordsPage() {
    return <><section className="screen-title"><span>成本账</span><h1>每一笔都能说清楚</h1><p>收入、支出、附件与核算状态都保存在当前行业账本中。</p></section><div className="record-filter"><button className={recordFilter === "all" ? "active" : ""} onClick={() => setRecordFilter("all")}>全部</button><button className={recordFilter === "expense" ? "active" : ""} onClick={() => setRecordFilter("expense")}>支出</button><button className={recordFilter === "income" ? "active" : ""} onClick={() => setRecordFilter("income")}>收入</button><button className={recordFilter === "refund" ? "active" : ""} onClick={() => setRecordFilter("refund")}>退款</button><button onClick={() => notify("当前查看 2026 年 7 月")}><CalendarDays size={14} />7 月</button></div><label className="search-field"><Search size={16} /><input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="搜索商户、备注或分类" /></label><section className="record-list">{groupedRecords.length === 0 && <div className="empty-state">没有匹配的流水，试试更换筛选条件。</div>}{groupedRecords.map((group) => <div key={group.date} className="record-group"><h3>{book.dateLabel(group.date)}<span>{group.date.replaceAll("-", " / ")}</span></h3>{group.records.map((record) => { const category = categoryByKey.get(record.categoryKey); const isIncome = record.type === "income"; return <button className="record-row" key={record.id} onClick={() => openRecordDetail(record.id)}><span className="record-icon" style={{ color: category?.color, background: `${category?.color || "#1677FF"}18` }}><ReceiptText size={18} /></span><span><b>{record.merchant}</b><em>{category?.label || "未分类"} · {record.note || "无备注"}{record.hasAttachment ? " · 有凭证" : ""}</em></span><strong className={isIncome ? "income" : ""}>{isIncome ? "+" : "-"}{yuan(record.amount)}</strong><ChevronRight size={16} /></button>; })}</div>)}</section><button className="floating-add" onClick={openNewRecord}><Plus size={22} />记一笔</button></>;
  }

  function AnalysisPage() {
    const period = analysisPeriod === "current" ? currentPeriod : book.previousPeriod(currentPeriod);
    const periodView = book.getPeriodView(period);
    const periodCost = periodView.totals.totalCost;
    const periodCategories = periodView.totals.categoryTotals;
    const maxTrend = Math.max(...trend.map((item) => Math.max(item.cost, item.revenue)));
    const topCards = [...cards].sort((a, b) => calcCard(b).cost - calcCard(a).cost).slice(0, 5);
    return <><section className="screen-title"><span>成本分析</span><h1>把花销变成判断</h1><p>当前口径按已过账交易的自然月聚合，不使用比例缩放。</p></section><div className="segment-control"><button className={analysisPeriod === "current" ? "active" : ""} onClick={() => setAnalysisPeriod("current")}>本月</button><button className={analysisPeriod === "last" ? "active" : ""} onClick={() => setAnalysisPeriod("last")}>上月</button></div><section className="analysis-hero"><div><span>{period.replace("-", " 年 ")} 月经营支出</span><strong>{yuan(periodCost)}</strong><em>预算占用 {periodView.totals.budgetUsed.toFixed(1)}%</em></div><div className="ring" style={{ background: `conic-gradient(${periodCategories.map((item, index) => `${item.color} ${periodCategories.slice(0, index).reduce((sum, value) => sum + value.amount, 0) / Math.max(periodCost, 1) * 100}% ${periodCategories.slice(0, index + 1).reduce((sum, value) => sum + value.amount, 0) / Math.max(periodCost, 1) * 100}%`).join(",")}` }}><i><b>{periodView.totals.grossMarginRate}%</b><small>毛利率</small></i></div></section><section className="metric-strip"><div><span>净营收</span><b>{yuan(periodView.totals.revenue)}</b></div><div><span>毛利率</span><b>{periodView.totals.grossMarginRate}%</b></div><div><span>经营利润率</span><b className={periodView.totals.operatingMarginRate >= 0 ? "up" : ""}>{periodView.totals.operatingMarginRate}%</b></div></section>
      <section className="chart-card"><div className="section-title"><div><span>近 6 月</span><h2>成本与收入趋势</h2></div><button onClick={() => notify("已切换为成本率口径")}>成本率 <ChevronDown size={14} /></button></div><div className="trend-chart">{trend.map((point) => <div key={point.month}><span className="trend-columns"><i style={{ height: `${point.cost / maxTrend * 100}%` }} /><i style={{ height: `${point.revenue / maxTrend * 100}%` }} /></span><em>{point.month.slice(5)} 月</em></div>)}</div><div className="chart-legend"><span><i className="cost" />成本</span><span><i className="revenue" />收入</span></div></section>
      <section className="section-block"><div className="section-title"><div><span>成本构成</span><h2>按金额排序</h2></div></div><div className="ranking-card">{periodCategories.map((item, index) => <button key={item.key} onClick={() => { setRecordSearch(item.label); setTab("records"); }}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="rank-name"><i style={{ background: item.color }} />{item.label}</span><span className="rank-bar"><b style={{ width: `${item.amount / Math.max(periodCategories[0]?.amount || 1, 1) * 100}%`, background: item.color }} /></span><strong>{Math.round(item.amount / Math.max(periodCost, 1) * 100)}%</strong></button>)}</div></section>
      <section className="section-block"><div className="section-title"><div><span>成本 TOP{topCards.length}</span><h2>高成本{template.entityLabel}</h2></div><button onClick={() => goSub("cards")}>全部 <ChevronRight size={15} /></button></div><div className="top-card-list">{topCards.map((card, index) => { const value = calcCard(card); return <button key={card.id} onClick={() => openCard(card.id)}><span>{index + 1}</span><b>{card.name}</b><em>{yuan(value.cost)} / {card.unit}</em><strong>{value.marginRate}% 毛利</strong></button>; })}</div></section>
      <section className="section-block"><div className="section-title"><div><span>供应商支出</span><h2>本月排行</h2></div><button onClick={() => goSub("suppliers")}>管理 <ChevronRight size={15} /></button></div><div className="supplier-rank">{suppliers.slice(0, 4).map((supplier) => <button key={supplier.id} onClick={() => goSub("suppliers")}><span>{supplier.name.slice(0, 1)}</span><b>{supplier.name}</b><em>{supplier.orders} 笔订单</em><strong>{yuan(supplier.spend)}</strong></button>)}</div></section>
      <section className="hidden-cost-card"><div><span>行业隐性成本 · 基准估算</span><h2>{template.label}漏损估算</h2><strong>{yuan(hiddenCosts.reduce((sum, item) => sum + item.estimate, 0))}</strong><em>不计入已实现成本；约占净营收 {(hiddenCosts.reduce((sum, item) => sum + item.estimate, 0) / Math.max(totals.revenue, 1) * 100).toFixed(1)}%</em></div><CircleAlert size={28} />{hiddenCosts.map((item) => <div className="hidden-row" key={item.key}><span>{item.label}</span><b>{yuan(item.estimate)}</b><i><em style={{ width: `${item.health}%` }} /></i></div>)}</section>
    </>;
  }

  function ProfilePage() {
    return <><section className="store-profile"><span className="store-avatar"><IndustryIcon size={24} /></span><div><h1>{template.storeName}</h1><p>{template.descriptor}</p></div><button onClick={() => goSub("industry")}><Settings2 size={18} /></button></section><section className="profile-card"><button onClick={() => goSub("industry")}><span><Store size={19} />经营行业</span><strong>{template.label}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("budget")}><span><WalletCards size={19} />预算设置</span><strong>{yuan(totals.budget)}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("reports")}><span><FileText size={19} />成本报表</span><strong>{reports.length} 期<ChevronRight size={16} /></strong></button><button onClick={() => goSub("suppliers")}><span><UsersRound size={19} />供应商</span><strong>{suppliers.length} 家<ChevronRight size={16} /></strong></button><button onClick={() => goSub("categories")}><span><Boxes size={19} />分类管理</span><strong>{categories.length} 类<ChevronRight size={16} /></strong></button></section><section className="profile-tip"><LineChart size={20} /><div><span>模板切换记录</span><p>{book.state.switchLog.length ? `最近一次切换为 ${template.label}，历史账本已归档保留。` : "当前使用行业模板，分类、图表与成本卡均按本行业口径计算。"}</p></div></section></>;
  }

  function IndustryPage() {
    return <><section className="sub-intro"><span>选择你的经营方式</span><h1>一套账本，<br />按行业展开。</h1><p>历史流水、成本卡和月报保持原行业口径；切换后新记录按目标行业归集。</p></section><div className="industry-picker">{Object.values(industryTemplates).map((item) => { const Icon = iconByIndustry[item.id]; const chosen = item.id === selectedIndustry; return <button key={item.id} className={chosen ? "chosen" : ""} onClick={() => setSelectedIndustry(item.id)}><span className="picker-icon"><Icon size={21} /></span><span><b>{item.label}</b><em>{item.descriptor}</em><small>{item.categories.slice(0, 2).map((category) => category.label).join(" / ")}</small></span>{chosen && <i>已选</i>}</button>; })}</div><div className="switch-note"><CircleAlert size={15} />切换后会创建目标行业分类；历史账本、成本卡和报告不会删除。</div><button className="fixed-primary" onClick={applyIndustry}>使用{industryTemplates[selectedIndustry].label}模板</button></>;
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
    return <><section className="sub-intro compact"><span>{template.label} · {template.entityLabel}核算</span><h1>{template.entityLabel}成本卡</h1><p>通过{template.formulaLabel}、人工与分摊重算单位成本和毛利率。</p></section><label className="search-field"><Search size={16} /><input value={cardSearch} onChange={(event) => setCardSearch(event.target.value)} placeholder={`搜索${template.entityLabel}名称或类型`} /></label><div className="cost-card-list">{visibleCards.map((card) => { const value = calcCard(card); return <button key={card.id} onClick={() => openCard(card.id)}><span className={card.status === "risk" ? "risk" : card.status === "attention" ? "attention" : "healthy"}><PackageOpen size={19} /></span><div><b>{card.name}</b><em>{card.kind} · {value.cost.toFixed(1)} 元 / {card.unit}</em></div><strong>{value.marginRate}%<small>毛利</small></strong><ChevronRight size={16} /></button>; })}{!visibleCards.length && <div className="empty-state">没有匹配的成本卡。</div>}</div></>;
  }

  function CardDetailPage() {
    if (!activeCard || !cardCost) return <div className="empty-state">成本卡不存在或已归档。</div>;
    const max = Math.max(...activeCard.history, cardCost.cost, 1);
    return <><section className="detail-hero"><span>{template.entityLabel}成本详情</span><h1>{activeCard.name}</h1><strong>{cardCost.cost.toFixed(1)} 元 / {activeCard.unit}</strong><p>售价 {yuan(activeCard.salePrice)} · 毛利率 {cardCost.marginRate}% · {activeCard.kind}</p></section><section className="cost-kpi-grid"><div><span>{template.formulaLabel}</span><b>{cardCost.material.toFixed(1)}</b></div><div><span>人工分摊</span><b>{activeCard.labor.toFixed(1)}</b></div><div><span>固定分摊</span><b>{activeCard.overhead.toFixed(1)}</b></div></section><section className="detail-breakdown"><h2>{template.formulaLabel}明细</h2><div className="bom-list">{activeCard.items.map((item) => <div key={item.id}><span><b>{item.name}</b><em>{item.spec || "规格待补充"} · {item.quantity}</em></span><strong>{yuan(item.amount)}</strong><button onClick={() => { book.removeBomItem(activeCard.id, item.id); notify("已删除成本项，单位成本已重算"); }} aria-label="删除成本项"><Trash2 size={15} /></button></div>)}</div><button onClick={() => goSub("bomForm")}>添加{template.formulaLabel}项 <Plus size={16} /></button></section><section className="detail-breakdown"><h2>近 6 月单位成本趋势</h2><div className="weekly-bars cost-history">{activeCard.history.map((amount, index) => <span key={`${amount}-${index}`}><i style={{ height: `${amount / max * 100}%`, background: index === activeCard.history.length - 1 ? "#1677FF" : "#cfe2ff" }} /><em>{index + 2} 月</em></span>)}</div></section></>;
  }

  function BomFormPage() {
    return <><section className="sub-intro compact"><span>{activeCard?.name || template.entityLabel} · {template.formulaLabel}</span><h1>添加成本项</h1><p>保存后会立刻重算单位成本、毛利率和成本趋势。</p></section><form className="record-form" onSubmit={saveBomItem}><label>成本项名称<input name="name" placeholder="例如：包装盒 / 服务耗材" /></label><label>规格<input name="spec" placeholder="例如：500g / 单次" /></label><label>数量<input name="quantity" placeholder="例如：1 份" defaultValue="1 份" /></label><label>金额<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" /></div></label><button className="fixed-primary form-save" type="submit"><Plus size={18} />加入并重算</button></form></>;
  }

  function BudgetPage() {
    return <><section className="detail-hero budget-detail"><span>{template.label}月度经营预算</span><h1>{yuan(totals.budget)}</h1><strong>{totals.budgetUsed.toFixed(1)}% 已用</strong><p>按销售成本与经营费用计算；{totals.budgetRemaining >= 0 ? `剩余 ${yuan(totals.budgetRemaining)}` : `超支 ${yuan(Math.abs(totals.budgetRemaining))}`}。</p></section><form className="record-form compact-form" onSubmit={saveBudget}><label>调整本月经营预算<div className="amount-input"><span>¥</span><input name="budget" type="number" min="1" defaultValue={totals.budget} /></div></label><button className="fixed-primary form-save" type="submit">保存预算</button></form><section className="detail-breakdown"><h2>预算建议</h2><div><span className="tip-icon"><CircleAlert size={18} /></span><p>{template.riskNote}</p></div><button onClick={() => notify("已开启 80% 预算提醒")}>开启 80% 提醒 <ChevronRight size={16} /></button></section></>;
  }

  function ReportsPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 月度经营</span><h1>成本报表</h1><p>草稿报表实时聚合交易；封存报表保留当期行业与分类快照。</p></section><div className="report-list">{reports.map((report) => <button key={report.id} onClick={() => openReport(report.id)}><span><FileText size={20} /></span><div><b>{report.month.replace("-", " 年 ")} 月经营报表</b><em>{report.status === "closed" ? "已封存" : "实时草稿"} · 支出 {yuan(report.cost)} · 净营收 {yuan(report.revenue)}</em></div><strong>{report.grossMarginRate}%<small>毛利率</small></strong><ChevronRight size={16} /></button>)}</div></>;
  }

  function ReportDetailPage() {
    if (!activeReport) return <div className="empty-state">报表不存在。</div>;
    return <><section className="detail-hero"><span>{template.label} · {activeReport.status === "closed" ? "已封存快照" : "实时草稿"}</span><h1>{activeReport.month.replace("-", " 年 ")} 月报</h1><strong>{yuan(activeReport.cost)}</strong><p>净营收 {yuan(activeReport.revenue)} · 毛利 {yuan(activeReport.margin)} · 毛利率 {activeReport.grossMarginRate}% · 经营利润率 {activeReport.operatingMarginRate}%</p></section><section className="detail-breakdown"><h2>分类明细</h2><div className="report-breakdown">{activeReport.snapshot.map((item) => <span key={item.key}><b>{item.label}</b><em>{yuan(item.amount)} · {item.pct}%</em></span>)}</div>{activeReport.status === "draft" ? <button onClick={() => { book.closeReport(activeReport.month); notify("月报已封存；之后的流水不会改写该快照"); }}>封存本月口径 <FileText size={16} /></button> : <button onClick={() => notify("报表导出将在云端版本生成")}>导出报表 <FileText size={16} /></button>}</section></>;
  }

  function deleteSupplier(id: string, name: string) {
    if (!window.confirm(`确认删除供应商“${name}”吗？`)) return;
    book.removeSupplier(id);
    notify("供应商已删除");
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
    return <><section className="sub-intro compact"><span>{template.label} · 账本口径</span><h1>分类管理</h1><p>分类会同步影响记账归集、成本构成、报表和隐性成本模型。</p></section><div className="category-manage-list">{categories.map((category) => <div key={category.id}><i style={{ background: category.color }} /><span><b>{category.label}</b><em>{category.hint}</em></span><button onClick={() => { const result = book.removeCategory(category.id); notify(result.ok ? "分类已删除" : result.reason || "无法删除分类"); }}><Trash2 size={16} /></button></div>)}</div><button className="fixed-primary" onClick={() => goSub("categoryForm")}><Plus size={18} />新增分类</button></>;
  }

  function CategoryFormPage() {
    return <><section className="sub-intro compact"><span>{template.label} · 分类口径</span><h1>新增分类</h1><p>新分类只作用于当前行业账本，历史行业分类不受影响。</p></section><form className="record-form" onSubmit={saveCategory}><label>分类名称<input name="label" placeholder="例如：内容制作" /></label><label>分类颜色<select name="color"><option value="#1677FF">品牌蓝</option><option value="#12B76A">绿色</option><option value="#F79009">橙色</option><option value="#7F56D9">紫色</option><option value="#F04438">红色</option></select></label><button type="submit" className="fixed-primary form-save"><Plus size={18} />保存分类</button></form></>;
  }

  function renderContent() {
    if (subPage === "industry") return IndustryPage();
    if (subPage === "record") return RecordPage();
    if (subPage === "recordDetail") return RecordDetailPage();
    if (subPage === "cards") return CardsPage();
    if (subPage === "cardDetail") return CardDetailPage();
    if (subPage === "bomForm") return BomFormPage();
    if (subPage === "budget") return BudgetPage();
    if (subPage === "reports") return ReportsPage();
    if (subPage === "reportDetail") return ReportDetailPage();
    if (subPage === "suppliers") return SuppliersPage();
    if (subPage === "supplierForm") return SupplierFormPage();
    if (subPage === "categories") return CategoriesPage();
    if (subPage === "categoryForm") return CategoryFormPage();
    if (tab === "records") return RecordsPage();
    if (tab === "analysis") return AnalysisPage();
    if (tab === "profile") return ProfilePage();
    return HomePage();
  }

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [{ id: "home", label: "工作台", icon: HomeIcon }, { id: "records", label: "记账", icon: ReceiptText }, { id: "analysis", label: "分析", icon: BarChart3 }, { id: "profile", label: "我的", icon: WalletCards }];
  return <div className="mobile-shell"><div className="app-frame">{renderHeader()}<main className={isSub ? "app-content sub-content" : "app-content"}>{renderContent()}</main>{!isSub && <nav className="tabbar" aria-label="主导航">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setRecordSearch(""); }}><Icon size={21} /><span>{label}</span></button>)}</nav>}{toast && <div className="app-toast">{toast}</div>}</div></div>;
}
