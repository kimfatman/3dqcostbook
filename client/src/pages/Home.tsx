/**
 * 账本蓝图：以数字蓝、海军蓝与冷白账页结构构建行业化经营成本看板。
 * 设计原则：先读数，再行动；行业切换同步改变成本结构、经营注记与风险焦点。
 */
import { FormEvent, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardPlus,
  FileText,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Scissors,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

type IndustryId = "canteen" | "retail" | "ecommerce" | "beauty" | "stall";

type Industry = {
  id: IndustryId;
  label: string;
  short: string;
  icon: LucideIcon;
  descriptor: string;
  costLabel: string;
  budget: number;
  cost: number;
  revenue: number;
  categories: { name: string; value: number; color: string }[];
  risk: string;
  note: string;
  actions: string[];
};

const industries: Industry[] = [
  {
    id: "canteen",
    label: "餐饮",
    short: "餐饮门店",
    icon: Utensils,
    descriptor: "餐厅 / 小吃 / 饮品店",
    costLabel: "菜品成本",
    budget: 160000,
    cost: 128640,
    revenue: 214300,
    categories: [
      { name: "食材采购", value: 61240, color: "#1677FF" },
      { name: "人力工资", value: 28800, color: "#12B76A" },
      { name: "房租水电", value: 19600, color: "#F79009" },
      { name: "营销推广", value: 10420, color: "#8B5CF6" },
    ],
    risk: "食材采购超预算 12.6%",
    note: "先复核高耗用菜品的用料与报损，再检查采购批次差价。",
    actions: ["盘点损耗", "更新配方", "核对采购"],
  },
  {
    id: "retail",
    label: "零售",
    short: "零售店铺",
    icon: ShoppingBag,
    descriptor: "服饰 / 百货 / 便利店",
    costLabel: "商品成本",
    budget: 150000,
    cost: 115460,
    revenue: 235800,
    categories: [
      { name: "商品采购", value: 58820, color: "#1677FF" },
      { name: "店员工资", value: 22800, color: "#12B76A" },
      { name: "租金物业", value: 18400, color: "#F79009" },
      { name: "折扣营销", value: 9120, color: "#8B5CF6" },
    ],
    risk: "库存持有成本持续上升",
    note: "低周转款需要尽早调价，避免季末折价侵蚀毛利。",
    actions: ["盘点库存", "筛选滞销", "调整折扣"],
  },
  {
    id: "ecommerce",
    label: "电商",
    short: "电商店铺",
    icon: ShoppingCart,
    descriptor: "平台店 / 直播店 / 独立站",
    costLabel: "商品成本",
    budget: 150000,
    cost: 128640,
    revenue: 214300,
    categories: [
      { name: "商品采购", value: 56620, color: "#1677FF" },
      { name: "平台佣金", value: 22960, color: "#12B76A" },
      { name: "广告投放", value: 18640, color: "#F79009" },
      { name: "物流仓储", value: 14280, color: "#8B5CF6" },
    ],
    risk: "退款与广告投放需要优先复核",
    note: "把退款后的实收口径与投放成本放进同一张账，先停掉低转化计划。",
    actions: ["查看退款", "复核投放", "核对结算"],
  },
  {
    id: "beauty",
    label: "美业服务",
    short: "美业工作室",
    icon: Scissors,
    descriptor: "美甲 / 美发 / 美容工作室",
    costLabel: "服务项目成本",
    budget: 125000,
    cost: 96420,
    revenue: 198600,
    categories: [
      { name: "技师工资", value: 37800, color: "#1677FF" },
      { name: "房租工位", value: 24600, color: "#12B76A" },
      { name: "耗材产品", value: 18420, color: "#F79009" },
      { name: "获客推广", value: 9180, color: "#8B5CF6" },
    ],
    risk: "工时空置与爽约正在拉低利润",
    note: "将预约密度和技师排班同步核对，优先填补工作日的低峰时段。",
    actions: ["查看排班", "追踪爽约", "管理耗材"],
  },
  {
    id: "stall",
    label: "小商贩",
    short: "摊位经营",
    icon: Store,
    descriptor: "夜市 / 集市 / 流动摊位",
    costLabel: "货品成本",
    budget: 68000,
    cost: 51280,
    revenue: 106400,
    categories: [
      { name: "进货成本", value: 27800, color: "#1677FF" },
      { name: "摊位交通", value: 8260, color: "#12B76A" },
      { name: "包装耗材", value: 6780, color: "#F79009" },
      { name: "损耗折价", value: 4480, color: "#8B5CF6" },
    ],
    risk: "尾货折价和摊位费占比偏高",
    note: "按客流分批补货，日终前主动清尾，避免把固定成本留到明天。",
    actions: ["记录进货", "查看客流", "处理尾货"],
  },
];

const navItems = [
  { label: "工作台", icon: LayoutDashboard },
  { label: "成本账", icon: ReceiptText },
  { label: "行业成本", icon: WalletCards },
  { label: "成本分析", icon: BarChart3 },
];

const fmt = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const money = (value: number) => `¥${fmt.format(value)}`;

function CircularMeter({ value }: { value: number }) {
  const clamped = Math.min(value, 100);
  return (
    <div className="meter" aria-label={`预算已使用 ${value}%`}>
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle className="meter-track" cx="60" cy="60" r="48" />
        <circle
          className="meter-value"
          cx="60"
          cy="60"
          r="48"
          style={{ strokeDasharray: `${clamped * 3.016} 302` }}
        />
      </svg>
      <div className="meter-copy"><strong>{value.toFixed(1)}%</strong><span>预算已用</span></div>
    </div>
  );
}

export default function Home() {
  const [activeId, setActiveId] = useState<IndustryId>("ecommerce");
  const [activeNav, setActiveNav] = useState("工作台");
  const [recordOpen, setRecordOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [lastAmount, setLastAmount] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  const active = useMemo(() => industries.find((item) => item.id === activeId) ?? industries[0], [activeId]);
  const remaining = active.budget - active.cost - lastAmount;
  const used = Math.min(((active.cost + lastAmount) / active.budget) * 100, 100);
  const margin = ((active.revenue - active.cost - lastAmount) / active.revenue) * 100;
  const icon = active.icon;
  const IndustryIcon = icon;

  function selectIndustry(id: IndustryId) {
    setActiveId(id);
    setLastAmount(0);
    setToast(`${industries.find((item) => item.id === id)?.label}模板已加载`);
    window.setTimeout(() => setToast(""), 1900);
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) {
      setToast("请填写正确的支出金额");
      return;
    }
    setLastAmount(amount);
    setRecordOpen(false);
    setToast(`已记录 ${money(amount)} ${active.costLabel}`);
    window.setTimeout(() => setToast(""), 2400);
  }

  return (
    <div className="app-shell">
      <aside className={`side-rail ${mobileMenu ? "is-open" : ""}`} aria-label="主导航">
        <div className="brand-lockup">
          <img src="/manus-storage/suandeqing-brand-mark_4e1ee068.png" alt="算得清品牌图标" className="brand-mark" />
          <div><strong>算得清</strong><span>商家成本管家</span></div>
        </div>

        <div className="rail-store">
          <span className="store-seal"><IndustryIcon size={18} /></span>
          <div><strong>{active.short}</strong><span>{active.descriptor}</span></div>
          <ChevronRight size={16} />
        </div>

        <nav className="rail-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={activeNav === label ? "is-active" : ""} onClick={() => setActiveNav(label)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="rail-bottom">
          <button><Bell size={17} />经营提醒<span className="notification-dot" /></button>
          <button><Settings size={17} />设置</button>
          <div className="rail-note"><Sparkles size={15} /><span>成本清楚，生意明白。</span></div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div className="mobile-brand"><img src="/manus-storage/suandeqing-brand-mark_4e1ee068.png" alt="" /><strong>算得清</strong></div>
          <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="打开导航"><Menu size={20} /></button>
          <div className="crumb"><span>经营工作台</span><ChevronRight size={15} /><strong>{active.label}模板</strong></div>
          <div className="top-actions"><button className="bell-button" aria-label="通知"><Bell size={18} /><i /></button><button className="avatar">老</button></div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />行业成本账本 · {active.label}</div>
            <h1>把成本算进<br /><em>每一次经营决策。</em></h1>
            <p>切换行业模板，让每一笔支出回到正确的成本结构。今天先看清 {active.risk.replace("正在", "")}。</p>
            <div className="hero-ledger" aria-label="首屏经营摘要">
              <div><span>当前行业</span><strong><IndustryIcon size={14} />{active.label}</strong></div>
              <div><span>本月成本</span><strong>{money(active.cost + lastAmount)}</strong></div>
              <div><span>预算占用</span><strong>{used.toFixed(1)}%</strong></div>
              <div className="hero-risk"><span>优先风险</span><strong>{active.risk}</strong></div>
            </div>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => setRecordOpen(true)}><ClipboardPlus size={18} />记录一笔支出</button>
              <button className="text-button" onClick={() => setActiveNav("成本分析")}>查看成本报告 <ArrowRight size={16} /></button>
            </div>
            <div className="hero-footnote"><CheckCircle2 size={15} />本月已自动归集 {active.categories.length} 类成本数据</div>
          </div>
          <div className="hero-visual">
            <img src="/manus-storage/cost-ledger-hero_570c17a1.png" alt="成本账本与行业经营数据插画" />
            <div className="visual-caption"><span><IndustryIcon size={16} />{active.label}</span><strong>成本结构已更新</strong></div>
          </div>
        </section>

        <section className="industry-section" aria-label="行业模板选择">
          <div className="section-heading"><div><span className="section-kicker">01 · 行业模板</span><h2>让成本结构贴合你的生意</h2></div><p>选择行业后，分类、风险注记和成本建议会同步变更。</p></div>
          <div className="industry-list">
            {industries.map((industry) => {
              const Icon = industry.icon;
              const selected = industry.id === activeId;
              return <button key={industry.id} className={`industry-card ${selected ? "is-selected" : ""}`} onClick={() => selectIndustry(industry.id)} aria-pressed={selected}>
                <span className="industry-icon"><Icon size={22} /></span>
                <span className="industry-title">{industry.label}</span>
                <span className="industry-desc">{industry.descriptor}</span>
                <span className="industry-preview"><b>{industry.categories[0].name}</b><em>成本焦点</em></span>
                <span className="industry-status">{selected ? "当前模板" : "切换模板"}<ChevronRight size={14} /></span>
              </button>;
            })}
          </div>
        </section>

        <section className="dashboard-grid" aria-label="经营概览">
          <div className="overview-panel ledger-card">
            <div className="card-header"><div><span className="section-kicker">02 · 经营概览</span><h2>本月经营摘要</h2></div><button className="period-button">2026 年 7 月 <ChevronRight size={15} /></button></div>
            <div className="metric-grid">
              <article className="metric-card"><span>本月总成本</span><strong>{money(active.cost + lastAmount)}</strong><small className="warning-text">↑ 1.8% <em>环比</em></small></article>
              <article className="metric-card"><span>本月收入</span><strong>{money(active.revenue)}</strong><small className="positive-text">↑ 6.2% <em>环比</em></small></article>
              <article className="metric-card"><span>毛利率</span><strong>{margin.toFixed(1)}%</strong><small className="positive-text">↑ 2.4pp <em>环比</em></small></article>
            </div>
            <div className="ledger-strip"><div><span>成本 / 收入趋势</span><strong>近 6 月持续改善</strong></div><div className="trend-bars" aria-label="近 6 月趋势"><i style={{ height: "40%" }} /><i style={{ height: "55%" }} /><i style={{ height: "48%" }} /><i style={{ height: "67%" }} /><i style={{ height: "61%" }} /><i className="focus" style={{ height: "82%" }} /></div></div>
          </div>

          <aside className="budget-panel ledger-card">
            <div className="card-header"><div><span className="section-kicker">预算进度</span><h2>本月预算</h2></div><span className="budget-tag">{used.toFixed(1)}% 已用</span></div>
            <CircularMeter value={used} />
            <div className="budget-row"><span>预算总额</span><strong>{money(active.budget)}</strong></div>
            <div className="budget-row"><span>可用余额</span><strong className={remaining < active.budget * 0.15 ? "budget-low" : ""}>{money(Math.max(remaining, 0))}</strong></div>
            <button className="outline-button" onClick={() => setToast("预算提醒已开启")}>设置预算提醒 <ChevronRight size={15} /></button>
          </aside>
        </section>

        <section className="analysis-grid">
          <article className="structure-panel ledger-card">
            <div className="card-header"><div><span className="section-kicker">03 · 成本结构</span><h2>{active.label}的成本去向</h2></div><button className="card-link" onClick={() => setActiveNav("成本分析")}>查看分析 <ChevronRight size={15} /></button></div>
            <div className="structure-content">
              <div className="share-disc"><div><strong>{money(active.cost + lastAmount)}</strong><span>本月成本</span></div></div>
              <div className="category-list">
                {active.categories.map((category) => {
                  const percentage = ((category.value / active.cost) * 100).toFixed(0);
                  return <div className="category-row" key={category.name}><span className="category-name"><i style={{ background: category.color }} />{category.name}</span><span className="category-bar"><b style={{ width: `${percentage}%`, background: category.color }} /></span><strong>{percentage}%</strong><em>{money(category.value)}</em></div>;
                })}
              </div>
            </div>
          </article>

          <aside className="risk-panel">
            <div className="risk-head"><span className="risk-icon"><CircleAlert size={19} /></span><div><span>经营注记</span><h3>{active.risk}</h3></div></div>
            <p>{active.note}</p>
            <div className="risk-actions">{active.actions.map((action) => <button key={action} onClick={() => setToast(`已打开“${action}”待办`)}>{action}<ChevronRight size={14} /></button>)}</div>
            <div className="risk-tail"><span>风险优先级</span><strong>需要关注</strong></div>
          </aside>
        </section>

        <section className="model-section ledger-card">
          <div className="model-copy"><span className="section-kicker">04 · 行业成本模型</span><h2>不同行业，看不同的成本漏点。</h2><p>算得清不会套用一张通用表。餐饮看损耗，电商看退款和结算，美业看工时，小商贩看尾货与摊位费。</p><button className="text-button" onClick={() => setToast("行业模型说明已展开")}>了解模型如何计算 <ArrowRight size={16} /></button></div>
          <img src="/manus-storage/industry-template-atlas_0be5f792.png" alt="五类行业成本模板图谱" />
        </section>

        <footer className="site-footer"><span><img src="/manus-storage/suandeqing-brand-mark_4e1ee068.png" alt="" />算得清 · 成本清楚，生意明白。</span><span>行业模板原型 · 本地演示数据</span></footer>
      </main>

      {recordOpen && <div className="modal-backdrop" role="presentation"><section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title"><button className="modal-close" onClick={() => setRecordOpen(false)} aria-label="关闭"><X size={20} /></button><span className="section-kicker">快速记账 · {active.label}</span><h2 id="record-title">记录一笔{active.costLabel}</h2><p>本次记录将同步反映在本地演示的预算与总成本中。</p><form onSubmit={saveRecord}><label>支出金额<input name="amount" type="number" min="0.01" step="0.01" placeholder="例如 680" autoFocus /></label><label>成本分类<select name="category">{active.categories.map((category) => <option key={category.name}>{category.name}</option>)}</select></label><label>备注<input name="memo" placeholder="例如：7 月平台服务费" /></label><button className="primary-button" type="submit"><FileText size={17} />保存记录</button></form></section></div>}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}
