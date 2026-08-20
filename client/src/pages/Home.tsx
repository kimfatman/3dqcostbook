/**
 * 移动账本 App：单手操作优先，四个一级 Tab + 可返回的二级页面栈。
 * 账本蓝图视觉仅服务于数据层级，不将桌面看板压缩进手机屏幕。
 */
import { FormEvent, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  LineChart,
  Plus,
  ReceiptText,
  Scissors,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Utensils,
  WalletCards,
} from "lucide-react";

type IndustryId = "canteen" | "retail" | "ecommerce" | "beauty" | "stall";
type TabId = "home" | "records" | "analysis" | "profile";
type SubPage = "industry" | "record" | "detail" | "budget" | null;

type Industry = {
  id: IndustryId;
  label: string;
  store: string;
  descriptor: string;
  icon: LucideIcon;
  revenue: number;
  cost: number;
  budget: number;
  risk: string;
  riskNote: string;
  categories: { name: string; value: number; color: string; hint: string }[];
};

const industries: Industry[] = [
  {
    id: "canteen", label: "餐饮", store: "川味小馆", descriptor: "餐厅 / 小吃 / 饮品店", icon: Utensils,
    revenue: 214300, cost: 128640, budget: 150000, risk: "食材采购超预算 12.6%", riskNote: "先盘点报损和高耗用菜品，再核对本周采购批次差价。",
    categories: [
      { name: "食材采购", value: 61240, color: "#1677FF", hint: "采购与报损" },
      { name: "人力工资", value: 28800, color: "#12B76A", hint: "排班与提成" },
      { name: "房租水电", value: 19600, color: "#F79009", hint: "固定成本" },
      { name: "营销推广", value: 10420, color: "#8B5CF6", hint: "团购与投流" },
    ],
  },
  {
    id: "retail", label: "零售", store: "橙子优选店", descriptor: "服饰 / 百货 / 便利店", icon: ShoppingBag,
    revenue: 235800, cost: 115460, budget: 150000, risk: "低周转库存正在占用资金", riskNote: "筛选近 60 天未动销商品，优先安排折扣和搭售。",
    categories: [
      { name: "商品采购", value: 58820, color: "#1677FF", hint: "进货与补货" },
      { name: "店员工资", value: 22800, color: "#12B76A", hint: "薪酬与提成" },
      { name: "租金物业", value: 18400, color: "#F79009", hint: "固定成本" },
      { name: "折扣营销", value: 9120, color: "#8B5CF6", hint: "优惠与活动" },
    ],
  },
  {
    id: "ecommerce", label: "电商", store: "蓝鲸电商店", descriptor: "平台店 / 直播店 / 独立站", icon: ShoppingCart,
    revenue: 214300, cost: 128640, budget: 150000, risk: "退款与广告投放需要优先复核", riskNote: "把退款后的实收与投放消耗放在同一张账，先停掉低转化计划。",
    categories: [
      { name: "商品采购", value: 56620, color: "#1677FF", hint: "货品与补货" },
      { name: "平台佣金", value: 22960, color: "#12B76A", hint: "服务与结算" },
      { name: "广告投放", value: 18640, color: "#F79009", hint: "推广与直播" },
      { name: "物流仓储", value: 14280, color: "#8B5CF6", hint: "运费与仓储" },
    ],
  },
  {
    id: "beauty", label: "美业服务", store: "美艺工作室", descriptor: "美甲 / 美发 / 美容工作室", icon: Scissors,
    revenue: 198600, cost: 96420, budget: 125000, risk: "工时空置与爽约正在拉低利润", riskNote: "先看低峰时段的预约密度，再调整技师排班与到店提醒。",
    categories: [
      { name: "技师工资", value: 37800, color: "#1677FF", hint: "底薪与提成" },
      { name: "房租工位", value: 24600, color: "#12B76A", hint: "固定成本" },
      { name: "耗材产品", value: 18420, color: "#F79009", hint: "用料与产品" },
      { name: "获客推广", value: 9180, color: "#8B5CF6", hint: "内容与投放" },
    ],
  },
  {
    id: "stall", label: "小商贩", store: "晚风夜市摊", descriptor: "夜市 / 集市 / 流动摊位", icon: Store,
    revenue: 106400, cost: 51280, budget: 68000, risk: "尾货折价和摊位费占比偏高", riskNote: "按客流分批进货，日终前主动清尾，别把固定成本留到明天。",
    categories: [
      { name: "进货成本", value: 27800, color: "#1677FF", hint: "货品与补货" },
      { name: "摊位交通", value: 8260, color: "#12B76A", hint: "出摊与运输" },
      { name: "包装耗材", value: 6780, color: "#F79009", hint: "包装与消耗" },
      { name: "损耗折价", value: 4480, color: "#8B5CF6", hint: "尾货与损耗" },
    ],
  },
];

const format = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const yuan = (n: number) => `¥${format.format(n)}`;

export default function Home() {
  const [tab, setTab] = useState<TabId>("home");
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [industryId, setIndustryId] = useState<IndustryId>("ecommerce");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>("ecommerce");
  const [selectedCategory, setSelectedCategory] = useState<string>("商品采购");
  const [recordedCost, setRecordedCost] = useState(0);
  const [detailName, setDetailName] = useState("");
  const [toast, setToast] = useState("");

  const industry = useMemo(() => industries.find((item) => item.id === industryId) ?? industries[0], [industryId]);
  const totalCost = industry.cost + recordedCost;
  const used = Math.min(totalCost / industry.budget * 100, 100);
  const grossMargin = ((industry.revenue - totalCost) / industry.revenue * 100).toFixed(1);
  const activeCategory = industry.categories.find((item) => item.name === detailName) ?? industry.categories[0];
  const IndustryIcon = industry.icon;
  const isSub = subPage !== null;

  const records = [
    { day: "今天", time: "10:42", name: industry.categories[0].name, note: industry.categories[0].hint, amount: 860 },
    { day: "今天", time: "09:15", name: industry.categories[1].name, note: industry.categories[1].hint, amount: 1280 },
    { day: "昨天", time: "16:20", name: industry.categories[2].name, note: industry.categories[2].hint, amount: 560 },
    { day: "昨天", time: "11:38", name: industry.categories[3].name, note: industry.categories[3].hint, amount: 420 },
  ];

  function goSub(page: SubPage, category?: string) {
    if (category) setDetailName(category);
    setSubPage(page);
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2100);
  }

  function changeIndustry() {
    const next = industries.find((item) => item.id === selectedIndustry) ?? industries[0];
    setIndustryId(next.id);
    setSelectedCategory(next.categories[0].name);
    setRecordedCost(0);
    setSubPage(null);
    setTab("profile");
    notify(`已切换为${next.label}模板`);
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) return notify("请填写正确的金额");
    setRecordedCost((current) => current + amount);
    setSubPage(null);
    setTab("records");
    notify(`已保存 ${yuan(amount)} 支出`);
  }

  function renderHeader() {
    const titles: Record<Exclude<SubPage, null>, string> = { industry: "切换行业", record: "记一笔", detail: "成本详情", budget: "预算管理" };
    if (isSub) return <header className="page-header sub-header"><button className="back-button" onClick={() => setSubPage(null)} aria-label="返回"><ArrowLeft size={21} /></button><strong>{titles[subPage]}</strong><span /></header>;
    return <header className="page-header"><div className="brand-mini"><img src="/manus-storage/suandeqing-brand-mark_4e1ee068.png" alt="算得清" /><span><strong>算得清</strong><em>{industry.label}成本账本</em></span></div><button className="header-icon" onClick={() => notify("今日暂无新的提醒")} aria-label="经营提醒"><Bell size={20} /><i /></button></header>;
  }

  function HomePage() {
    return <>
      <section className="dashboard-kicker"><span>工作台 · 2026 年 7 月</span><h1><IndustryIcon size={20} />{industry.label}经营仪表盘</h1><em>{industry.store} · {industry.categories[0].name} / {industry.categories[1].name}</em></section>
      <section className="summary-card">
        <div className="summary-head"><span><IndustryIcon size={16} />{industry.label} · 成本总览</span><button onClick={() => goSub("industry")}>行业模板 <ChevronRight size={14} /></button></div>
        <div className="summary-main"><div><span>本月总成本</span><strong>{yuan(totalCost)}</strong><em>较上月 <b>+1.8%</b></em></div><img src="/manus-storage/mobile-cost-dashboard_efecf7a5.png" alt="成本数据插画" /></div>
        <div className="summary-grid"><span><b>{used.toFixed(1)}%</b>预算已用</span><span><b>{grossMargin}%</b>毛利率</span><span><b>{yuan(Math.max(industry.budget - totalCost, 0))}</b>可用余额</span></div>
        <div className="summary-risk"><CircleAlert size={14} /><span>优先风险</span><strong>{industry.risk}</strong></div>
      </section>
      <button className="risk-card" onClick={() => goSub("detail", industry.categories[0].name)}><span className="risk-symbol"><CircleAlert size={19} /></span><span><em>优先风险</em><strong>{industry.risk}</strong><small>{industry.riskNote}</small></span><ChevronRight size={18} /></button>
      <section className="section-block"><div className="section-title"><div><span>今日经营</span><h2>快捷查看</h2></div><button onClick={() => setTab("analysis")}>全部 <ChevronRight size={15} /></button></div><div className="quick-grid"><button onClick={() => goSub("record")}><span className="quick-icon blue"><Plus size={20} /></span><b>记一笔</b><em>快速录入支出</em></button><button onClick={() => goSub("budget")}><span className="quick-icon green"><WalletCards size={20} /></span><b>看预算</b><em>本月占用 {used.toFixed(0)}%</em></button><button onClick={() => goSub("detail", industry.categories[0].name)}><span className="quick-icon orange"><ClipboardList size={20} /></span><b>看成本</b><em>{industry.categories[0].name}</em></button></div></section>
      <section className="section-block"><div className="section-title"><div><span>成本构成</span><h2>本月花在哪</h2></div><button onClick={() => setTab("analysis")}>分析 <ChevronRight size={15} /></button></div><div className="category-card">{industry.categories.map((item) => <button className="category-cell" key={item.name} onClick={() => goSub("detail", item.name)}><span className="category-dot" style={{ background: item.color }} /><span className="category-info"><b>{item.name}</b><em>{item.hint}</em></span><strong>{yuan(item.value)}</strong><ChevronRight size={15} /></button>)}</div></section>
    </>;
  }

  function RecordsPage() {
    return <><section className="screen-title"><span>成本账</span><h1>每一笔都能说清楚</h1><p>按日期归集，随时核对今天的经营支出。</p></section><div className="record-filter"><button className="active">全部</button><button>支出</button><button>收入</button><button><FileText size={14} />7 月</button></div><section className="record-list">{records.map((record, index) => <div key={`${record.day}-${record.time}`} className="record-group">{(index === 0 || records[index - 1].day !== record.day) && <h3>{record.day}<span>7 月 {index < 2 ? "14" : "13"} 日</span></h3>}<button className="record-row" onClick={() => goSub("detail", record.name)}><span className="record-icon"><ReceiptText size={18} /></span><span><b>{record.name}</b><em>{record.note} · {record.time}</em></span><strong>-{yuan(record.amount)}</strong><ChevronRight size={16} /></button></div>)}</section><button className="floating-add" onClick={() => goSub("record")}><Plus size={22} />记一笔</button></>;
  }

  function AnalysisPage() {
    return <><section className="screen-title"><span>成本分析</span><h1>把花销变成判断</h1><p>先看占用，再判断哪一类成本需要处理。</p></section><section className="analysis-hero"><div><span>预算进度</span><strong>{used.toFixed(1)}%</strong><em>本月已用 {yuan(totalCost)}</em></div><div className="ring" style={{ background: `conic-gradient(#1677FF 0 ${used}%, rgba(255,255,255,.18) ${used}% 100%)` }}><i /></div></section><section className="metric-strip"><div><span>收入</span><b>{yuan(industry.revenue)}</b></div><div><span>毛利率</span><b>{grossMargin}%</b></div><div><span>趋势</span><b className="up"><TrendingUp size={14} />改善</b></div></section><section className="section-block"><div className="section-title"><div><span>成本排名</span><h2>按金额排序</h2></div><button onClick={() => notify("已切换为成本率口径")}>金额 <ChevronRight size={15} /></button></div><div className="ranking-card">{industry.categories.map((item, index) => <button key={item.name} onClick={() => goSub("detail", item.name)}><span className="rank">0{index + 1}</span><span className="rank-name"><i style={{ background: item.color }} />{item.name}</span><span className="rank-bar"><b style={{ width: `${item.value / industry.categories[0].value * 100}%`, background: item.color }} /></span><strong>{Math.round(item.value / totalCost * 100)}%</strong></button>)}</div></section></>;
  }

  function ProfilePage() {
    return <><section className="store-profile"><span className="store-avatar"><IndustryIcon size={24} /></span><div><h1>{industry.store}</h1><p>{industry.descriptor}</p></div><button onClick={() => goSub("industry")}><Settings2 size={18} /></button></section><section className="profile-card"><button onClick={() => goSub("industry")}><span><Store size={19} />经营行业</span><strong>{industry.label}<ChevronRight size={16} /></strong></button><button onClick={() => goSub("budget")}><span><WalletCards size={19} />预算设置</span><strong>{yuan(industry.budget)}<ChevronRight size={16} /></strong></button><button onClick={() => notify("提醒已开启") }><span><Bell size={19} />经营提醒</span><strong>已开启<ChevronRight size={16} /></strong></button></section><section className="profile-tip"><LineChart size={20} /><div><span>本周成本小结</span><p>已归集 {industry.categories.length} 类成本，建议优先查看 {industry.risk.replace("正在", "")}。</p></div></section></>;
  }

  function IndustryPage() {
    return <><section className="sub-intro"><span>选择你的经营方式</span><h1>一套账本，<br />按行业展开。</h1><p>切换后会更新成本分类、风险注记和推荐操作，演示数据将同步刷新。</p></section><div className="industry-picker">{industries.map((item) => { const Icon = item.icon; const chosen = item.id === selectedIndustry; return <button key={item.id} className={chosen ? "chosen" : ""} onClick={() => setSelectedIndustry(item.id)}><span className="picker-icon"><Icon size={21} /></span><span><b>{item.label}</b><em>{item.descriptor}</em><small>{item.categories.map((category) => category.name).slice(0, 2).join(" / ")}</small></span>{chosen && <i>已选</i>}</button>; })}</div><button className="fixed-primary" onClick={changeIndustry}>使用{industries.find((item) => item.id === selectedIndustry)?.label}模板</button></>;
  }

  function RecordPage() {
    return <><section className="sub-intro compact"><span>{industry.label} · 成本记账</span><h1>记录一笔支出</h1><p>先选分类，再补充金额和备注；保存后会刷新本月成本。</p></section><form className="record-form" onSubmit={saveRecord}><label>支出金额<div className="amount-input"><span>¥</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" autoFocus /></div></label><label>成本分类<div className="category-chips">{industry.categories.map((item) => <button type="button" key={item.name} className={selectedCategory === item.name ? "selected" : ""} onClick={() => setSelectedCategory(item.name)}>{item.name}</button>)}</div><input type="hidden" name="category" value={selectedCategory} /></label><label>备注<input name="memo" placeholder={`例如：${industry.categories[0].hint}`} /></label><button type="submit" className="fixed-primary form-save"><Plus size={18} />保存记录</button></form></>;
  }

  function DetailPage() {
    const ratio = Math.round(activeCategory.value / totalCost * 100);
    return <><section className="detail-hero"><span className="detail-dot" style={{ background: activeCategory.color }} /><span>本月成本分类</span><h1>{activeCategory.name}</h1><strong>{yuan(activeCategory.value)}</strong><p>占本月总成本 {ratio}% · {activeCategory.hint}</p></section><section className="detail-breakdown"><h2>经营提示</h2><div><span className="tip-icon"><TrendingDown size={18} /></span><p>{industry.riskNote}</p></div><button onClick={() => notify("已加入待处理事项")}>加入待处理 <ChevronRight size={16} /></button></section><section className="detail-breakdown"><h2>近 4 周趋势</h2><div className="weekly-bars">{[42, 66, 48, 82].map((height, index) => <span key={height}><i style={{ height: `${height}%`, background: index === 3 ? activeCategory.color : "#cfe2ff" }} /><em>第 {index + 1} 周</em></span>)}</div></section></>;
  }

  function BudgetPage() {
    return <><section className="detail-hero budget-detail"><span>本月预算</span><h1>{yuan(industry.budget)}</h1><strong>{used.toFixed(1)}% 已用</strong><p>已用 {yuan(totalCost)}，本月仍可使用 {yuan(Math.max(industry.budget - totalCost, 0))}。</p></section><section className="detail-breakdown"><h2>预算建议</h2><div><span className="tip-icon"><CircleAlert size={18} /></span><p>{industry.risk}</p></div><button onClick={() => notify("已开启 80% 预算提醒")}>开启 80% 提醒 <ChevronRight size={16} /></button></section></>;
  }

  function renderContent() {
    if (subPage === "industry") return <IndustryPage />;
    if (subPage === "record") return <RecordPage />;
    if (subPage === "detail") return <DetailPage />;
    if (subPage === "budget") return <BudgetPage />;
    if (tab === "records") return <RecordsPage />;
    if (tab === "analysis") return <AnalysisPage />;
    if (tab === "profile") return <ProfilePage />;
    return <HomePage />;
  }

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: "home", label: "工作台", icon: HomeIcon },
    { id: "records", label: "记账", icon: ReceiptText },
    { id: "analysis", label: "分析", icon: BarChart3 },
    { id: "profile", label: "我的", icon: WalletCards },
  ];

  return <div className="mobile-shell"><div className="app-frame">{renderHeader()}<main className={isSub ? "app-content sub-content" : "app-content"}>{renderContent()}</main>{!isSub && <nav className="tabbar" aria-label="主导航">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>}{toast && <div className="app-toast">{toast}</div>}</div></div>;
}
