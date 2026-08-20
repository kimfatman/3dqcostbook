/**
 * 算得清统一账本数据层。
 * 业务数据以 workspaceId + industryId 隔离；页面只读取派生结果，不再写死展示金额。
 */
import { useEffect, useMemo, useState } from "react";

export type IndustryId = "canteen" | "retail" | "ecommerce" | "beauty" | "stall";
export type RecordType = "expense" | "income" | "refund";
export type RecordStatus = "accounted" | "pending" | "abnormal";

export type Category = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  key: string;
  label: string;
  color: string;
  hint: string;
  archived?: boolean;
};

export type CostRecord = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  categoryKey: string;
  date: string;
  type: RecordType;
  amount: number;
  merchant: string;
  note: string;
  status: RecordStatus;
  hasAttachment: boolean;
  createdAt: string;
};

export type BomItem = { id: string; name: string; spec: string; quantity: string; amount: number };

export type CostCard = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  name: string;
  kind: string;
  unit: string;
  salePrice: number;
  labor: number;
  overhead: number;
  items: BomItem[];
  history: number[];
  status: "healthy" | "attention" | "risk";
};

export type Supplier = {
  id: string;
  workspaceId: string;
  industryIds: (IndustryId | "shared")[];
  name: string;
  contact: string;
  categoryKey: string;
  spend: number;
  orders: number;
  trend: "up" | "down";
};

export type Report = {
  id: string;
  workspaceId: string;
  industryId: IndustryId;
  month: string;
  revenue: number;
  cost: number;
  margin: number;
  status: "generated";
  snapshot: { key: string; label: string; amount: number; pct: number; delta: number }[];
};

export type IndustryTemplate = {
  id: IndustryId;
  label: string;
  descriptor: string;
  storeName: string;
  budget: number;
  baselineRevenue: number;
  entityLabel: string;
  formulaLabel: string;
  unitLabel: string;
  risk: string;
  riskNote: string;
  categories: Omit<Category, "id" | "workspaceId" | "industryId">[];
  hiddenCost: { key: string; label: string; rate: number; basisKeys: string[]; tip: string }[];
};

type BookState = {
  workspace: { id: string; activeIndustryId: IndustryId; budgetByIndustry: Record<IndustryId, number>; switchedAt: string };
  categories: Category[];
  records: CostRecord[];
  cards: CostCard[];
  suppliers: Supplier[];
  reports: Report[];
  switchLog: { id: string; from: IndustryId; to: IndustryId; at: string; strategy: "future_only" }[];
};

const WORKSPACE_ID = "workspace-main";
const STORAGE_KEY = "sqd-mobile-book-v1";
const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const industryTemplates: Record<IndustryId, IndustryTemplate> = {
  canteen: {
    id: "canteen", label: "餐饮", descriptor: "餐厅 / 小吃 / 饮品店", storeName: "川味小馆", budget: 160000, baselineRevenue: 214300,
    entityLabel: "菜品", formulaLabel: "配方", unitLabel: "份", risk: "食材采购超预算，需要核对损耗", riskNote: "先盘点报损和高耗用菜品，再核对本周采购批次差价。",
    categories: [
      { key: "food_purchase", label: "食材采购", color: "#1677FF", hint: "食材 / 粮油 / 调料" }, { key: "labor", label: "人力工资", color: "#12B76A", hint: "后厨 / 前厅 / 提成" },
      { key: "rent_utilities", label: "房租水电", color: "#F79009", hint: "租金 / 水电 / 物业" }, { key: "marketing", label: "营销推广", color: "#7F56D9", hint: "团购 / 本地生活" },
      { key: "logistics_storage", label: "物流仓储", color: "#0B1836", hint: "冷链 / 配送 / 仓储" }, { key: "depreciation", label: "设备折旧", color: "#F04438", hint: "厨房设备" }, { key: "other", label: "其他", color: "#A3AEC2", hint: "其他支出" },
    ],
    hiddenCost: [
      { key: "food_loss", label: "食材损耗", rate: .07, basisKeys: ["food_purchase"], tip: "登记报损并按日盘点，替换基准估算。" }, { key: "utility_loss", label: "水电隐性浪费", rate: .1, basisKeys: ["rent_utilities"], tip: "识别冷库和待机能耗。" }, { key: "expiry", label: "库存过期", rate: .03, basisKeys: ["food_purchase"], tip: "按先进先出补货。" },
    ],
  },
  retail: {
    id: "retail", label: "零售", descriptor: "服饰 / 百货 / 便利店", storeName: "橙子优选店", budget: 150000, baselineRevenue: 235800,
    entityLabel: "商品", formulaLabel: "成本构成", unitLabel: "件", risk: "低周转库存正在占用资金", riskNote: "筛选近 60 天未动销商品，优先安排折扣和搭售。",
    categories: [
      { key: "goods_purchase", label: "商品采购", color: "#1677FF", hint: "进货 / 补货" }, { key: "labor", label: "人力工资", color: "#12B76A", hint: "店员 / 提成" },
      { key: "rent_utilities", label: "房租水电", color: "#F79009", hint: "租金 / 物业" }, { key: "marketing", label: "营销推广", color: "#7F56D9", hint: "促销 / 折扣" },
      { key: "delivery", label: "物流配送", color: "#0B1836", hint: "配送 / 调货" }, { key: "shrinkage", label: "损耗报损", color: "#F04438", hint: "破损 / 丢失" }, { key: "other", label: "其他", color: "#A3AEC2", hint: "其他支出" },
    ],
    hiddenCost: [
      { key: "shrinkage", label: "门店损耗", rate: .016, basisKeys: ["goods_purchase"], tip: "定期盘点并核对破损与上架流程。" }, { key: "carrying", label: "库存持有", rate: .021, basisKeys: ["goods_purchase"], tip: "压缩高值低周转库存。" }, { key: "obsolete", label: "滞销过时", rate: .125, basisKeys: ["goods_purchase"], tip: "在过季前提前促销清库。" },
    ],
  },
  ecommerce: {
    id: "ecommerce", label: "电商", descriptor: "平台店 / 直播店 / 独立站", storeName: "蓝鲸电商店", budget: 150000, baselineRevenue: 214300,
    entityLabel: "商品", formulaLabel: "成本构成", unitLabel: "件", risk: "退款与广告投放需要优先复核", riskNote: "把退款后的实收与投放消耗放在同一张账，先停掉低转化计划。",
    categories: [
      { key: "goods_purchase", label: "商品采购", color: "#1677FF", hint: "货品 / 补货" }, { key: "platform_fee", label: "平台佣金", color: "#12B76A", hint: "服务 / 结算" },
      { key: "fulfillment", label: "履约物流", color: "#F79009", hint: "快递 / 配送" }, { key: "ad_spend", label: "广告投放", color: "#7F56D9", hint: "推广 / 直播" },
      { key: "warehouse_packaging", label: "仓储包装", color: "#0B1836", hint: "包材 / 仓储" }, { key: "returns", label: "退款售后", color: "#F04438", hint: "退款 / 售后" },
      { key: "labor", label: "人工工资", color: "#667085", hint: "运营 / 客服" }, { key: "other", label: "其他", color: "#A3AEC2", hint: "其他支出" },
    ],
    hiddenCost: [
      { key: "refund", label: "退款退货损失", rate: .05, basisKeys: ["revenue"], tip: "按渠道、商品和原因拆分退款。" }, { key: "platform", label: "平台结算漏损", rate: .06, basisKeys: ["platform_fee"], tip: "逐单核对活动、佣金和到账金额。" },
      { key: "ad", label: "广告无效消耗", rate: .12, basisKeys: ["ad_spend"], tip: "跟踪投产比与退款后收入。" }, { key: "inventory", label: "库存资金占用", rate: .015, basisKeys: ["goods_purchase"], tip: "按库龄和周转天数清理库存。" },
    ],
  },
  beauty: {
    id: "beauty", label: "美业服务", descriptor: "美甲 / 美发 / 美容工作室", storeName: "美艺工作室", budget: 125000, baselineRevenue: 198600,
    entityLabel: "服务项目", formulaLabel: "服务耗用", unitLabel: "次", risk: "工时空置与爽约正在拉低利润", riskNote: "先看低峰时段的预约密度，再调整技师排班与到店提醒。",
    categories: [
      { key: "materials", label: "产品耗材", color: "#1677FF", hint: "产品 / 耗材" }, { key: "technician_labor", label: "技师工资", color: "#12B76A", hint: "底薪 / 提成" },
      { key: "rent_utilities", label: "房租水电", color: "#F79009", hint: "门店 / 工位" }, { key: "marketing", label: "营销推广", color: "#7F56D9", hint: "内容 / 获客" },
      { key: "depreciation", label: "设备折旧", color: "#0B1836", hint: "仪器 / 设备" }, { key: "sundries", label: "耗品杂项", color: "#F04438", hint: "清洁 / 杂项" }, { key: "other", label: "其他", color: "#A3AEC2", hint: "其他支出" },
    ],
    hiddenCost: [
      { key: "idle", label: "工时空置", rate: .4, basisKeys: ["technician_labor"], tip: "按预约密度动态排班。" }, { key: "noshow", label: "爽约损失", rate: .1, basisKeys: ["revenue"], tip: "到店前 24 小时确认预约。" }, { key: "chair", label: "空置工位", rate: .028, basisKeys: ["rent_utilities"], tip: "提高翻台或安排分时合租。" },
    ],
  },
  stall: {
    id: "stall", label: "小商贩", descriptor: "夜市 / 集市 / 流动摊位", storeName: "晚风夜市摊", budget: 68000, baselineRevenue: 106400,
    entityLabel: "货品", formulaLabel: "进货构成", unitLabel: "件", risk: "尾货折价和摊位费占比偏高", riskNote: "按客流分批进货，日终前主动清尾，别把固定成本留到明天。",
    categories: [
      { key: "purchase", label: "进货成本", color: "#1677FF", hint: "货品 / 补货" }, { key: "stall_fee", label: "摊位费", color: "#F79009", hint: "场地 / 市集" },
      { key: "transport_handling", label: "交通搬运", color: "#12B76A", hint: "交通 / 搬运" }, { key: "clearance_loss", label: "损耗折价", color: "#F04438", hint: "尾货 / 损耗" }, { key: "misc", label: "其他杂费", color: "#A3AEC2", hint: "其他支出" },
    ],
    hiddenCost: [
      { key: "loss", label: "货品损耗", rate: .07, basisKeys: ["purchase"], tip: "按客流分批进货，减少隔夜损耗。" }, { key: "fee", label: "摊位费占比", rate: .1, basisKeys: ["revenue"], tip: "评估换摊或分时租摊。" },
      { key: "gap", label: "出摊空档", rate: .15, basisKeys: ["stall_fee", "transport_handling"], tip: "为雨天和缺勤准备替代销售渠道。" }, { key: "clearance", label: "尾货折价", rate: .03, basisKeys: ["purchase"], tip: "预估当日客流，宁可少进勤补。" },
    ],
  },
};

const amounts: Record<IndustryId, number[]> = {
  canteen: [61240, 28800, 15480, 10800, 4560, 3860, 3900],
  retail: [58820, 22800, 18400, 9120, 6240, 4680, 5400],
  ecommerce: [56620, 22960, 14280, 18640, 7320, 5620, 8200, 5000],
  beauty: [18420, 37800, 24600, 9180, 3620, 1680, 1120],
  stall: [27800, 8260, 6780, 4480, 3960],
};

const seedCards: Record<IndustryId, Omit<CostCard, "id" | "workspaceId" | "industryId">[]> = {
  canteen: [
    { name: "水煮鱼", kind: "热菜", unit: "份", salePrice: 68, labor: 4.2, overhead: 1.8, status: "attention", history: [26.1, 25.8, 26.4, 25.9, 25.2, 24.6], items: [{ id: "b1", name: "黑鱼", spec: "750g", quantity: "1 条", amount: 12.9 }, { id: "b2", name: "黄豆芽", spec: "300g", quantity: "1 份", amount: 1.6 }, { id: "b3", name: "干辣椒 / 花椒", spec: "", quantity: "1 份", amount: 2.4 }, { id: "b4", name: "食用油及辅料", spec: "", quantity: "1 份", amount: 1.7 }] },
    { name: "毛血旺", kind: "热菜", unit: "份", salePrice: 58, labor: 4, overhead: 2.8, status: "healthy", history: [23.4, 23.1, 23, 22.8, 23.2, 22.9], items: [{ id: "b5", name: "毛肚", spec: "250g", quantity: "1 份", amount: 8.5 }, { id: "b6", name: "鸭血", spec: "400g", quantity: "1 份", amount: 2.2 }, { id: "b7", name: "午餐肉", spec: "200g", quantity: "1 份", amount: 3.4 }] },
  ],
  retail: [{ name: "云朵枕套", kind: "家居 SKU", unit: "件", salePrice: 59, labor: 2.6, overhead: 3.2, status: "healthy", history: [33, 31, 30, 30, 29, 28], items: [{ id: "r1", name: "进货价", spec: "单件", quantity: "1 件", amount: 20 }, { id: "r2", name: "入库物流", spec: "单件", quantity: "1 件", amount: 2.2 }] }, { name: "轻薄防晒衣", kind: "服饰 SKU", unit: "件", salePrice: 129, labor: 5, overhead: 8, status: "attention", history: [78, 74, 77, 81, 84, 86], items: [{ id: "r3", name: "进货价", spec: "单件", quantity: "1 件", amount: 66 }, { id: "r4", name: "折扣损耗", spec: "单件", quantity: "1 件", amount: 7 }] }],
  ecommerce: [{ name: "轻盈收纳盒", kind: "平台 SKU", unit: "件", salePrice: 68, labor: 3.2, overhead: 4.1, status: "healthy", history: [34, 33, 32, 31, 31, 30], items: [{ id: "e1", name: "货品采购", spec: "单件", quantity: "1 件", amount: 20 }, { id: "e2", name: "快递与包材", spec: "单件", quantity: "1 件", amount: 5.6 }, { id: "e3", name: "平台佣金", spec: "单件", quantity: "1 件", amount: 5.2 }] }, { name: "云感夏凉被", kind: "直播 SKU", unit: "件", salePrice: 139, labor: 5, overhead: 7.5, status: "attention", history: [72, 75, 74, 81, 85, 87], items: [{ id: "e4", name: "货品采购", spec: "单件", quantity: "1 件", amount: 61 }, { id: "e5", name: "广告归因", spec: "单件", quantity: "1 件", amount: 10 }] }],
  beauty: [{ name: "轻氧小气泡", kind: "护理项目", unit: "次", salePrice: 328, labor: 78, overhead: 36, status: "healthy", history: [176, 170, 174, 168, 165, 162], items: [{ id: "m1", name: "清洁套盒", spec: "单次", quantity: "1 套", amount: 32 }, { id: "m2", name: "修护精华", spec: "单次", quantity: "1 份", amount: 16 }] }, { name: "日式美甲", kind: "美甲项目", unit: "次", salePrice: 198, labor: 58, overhead: 28, status: "attention", history: [128, 131, 127, 135, 138, 141], items: [{ id: "m3", name: "甲油胶", spec: "单次", quantity: "1 份", amount: 16 }, { id: "m4", name: "一次性耗材", spec: "单次", quantity: "1 份", amount: 8 }] }],
  stall: [{ name: "夜市烤肠", kind: "摊位货品", unit: "份", salePrice: 12, labor: 1.2, overhead: .8, status: "healthy", history: [5.2, 5.1, 5.3, 5.4, 5.1, 5], items: [{ id: "s1", name: "香肠", spec: "单份", quantity: "1 根", amount: 2.4 }, { id: "s2", name: "调料与包装", spec: "单份", quantity: "1 份", amount: .6 }] }, { name: "手作柠檬茶", kind: "摊位货品", unit: "杯", salePrice: 15, labor: 1.5, overhead: 1, status: "attention", history: [8.1, 8.3, 8.4, 8.2, 8.6, 8.9], items: [{ id: "s3", name: "柠檬与茶底", spec: "单杯", quantity: "1 杯", amount: 4.6 }, { id: "s4", name: "杯子吸管", spec: "单杯", quantity: "1 套", amount: .8 }] }],
};

function createCategories(industryId: IndustryId) {
  return industryTemplates[industryId].categories.map((category) => ({ ...category, id: `${industryId}-${category.key}`, workspaceId: WORKSPACE_ID, industryId }));
}

function createRecords(industryId: IndustryId): CostRecord[] {
  const template = industryTemplates[industryId];
  const values = amounts[industryId];
  return template.categories.map((category, index) => ({
    id: `${industryId}-seed-${index}`,
    workspaceId: WORKSPACE_ID,
    industryId,
    categoryKey: category.key,
    date: index < 4 ? "2026-07-14" : "2026-07-13",
    type: "expense",
    amount: values[index] ?? 0,
    merchant: `${category.label}结算`,
    note: category.hint,
    status: index === 0 ? "abnormal" : index === 1 ? "pending" : "accounted",
    hasAttachment: index % 2 === 0,
    createdAt: "2026-07-14T10:00:00.000Z",
  }));
}

function createCards(industryId: IndustryId): CostCard[] {
  return seedCards[industryId].map((card, index) => ({ ...card, id: `${industryId}-card-${index + 1}`, workspaceId: WORKSPACE_ID, industryId }));
}

function createSuppliers(industryId: IndustryId): Supplier[] {
  const template = industryTemplates[industryId];
  return template.categories.slice(0, 4).map((category, index) => ({
    id: `${industryId}-supplier-${index + 1}`,
    workspaceId: WORKSPACE_ID,
    industryIds: [industryId],
    name: `${category.label}${index === 0 ? "供应商" : "服务商"}`,
    contact: `联系人 ${index + 1}`,
    categoryKey: category.key,
    spend: Math.round((amounts[industryId][index] ?? 1000) * .65),
    orders: 3 + index * 4,
    trend: index % 2 === 0 ? "up" : "down",
  }));
}

function createReports(industryId: IndustryId): Report[] {
  const template = industryTemplates[industryId];
  const currentCost = amounts[industryId].reduce((sum, amount) => sum + amount, 0);
  return [0, 1, 2].map((index) => {
    const factor = 1 - index * .055;
    const cost = Math.round(currentCost * factor);
    const revenue = Math.round(template.baselineRevenue * (1 - index * .04));
    const snapshot = template.categories.map((category, categoryIndex) => {
      const amount = Math.round((amounts[industryId][categoryIndex] ?? 0) * factor);
      return { key: category.key, label: category.label, amount, pct: cost ? Number((amount / cost * 100).toFixed(1)) : 0, delta: index === 0 ? 1.2 : -.6 };
    });
    return { id: `${industryId}-report-${index}`, workspaceId: WORKSPACE_ID, industryId, month: `2026-${String(7 - index).padStart(2, "0")}`, revenue, cost, margin: revenue - cost, status: "generated" as const, snapshot };
  });
}

function createSeedState(): BookState {
  const ids = Object.keys(industryTemplates) as IndustryId[];
  return {
    workspace: { id: WORKSPACE_ID, activeIndustryId: "ecommerce", budgetByIndustry: Object.fromEntries(ids.map((id) => [id, industryTemplates[id].budget])) as Record<IndustryId, number>, switchedAt: "2026-07-14T10:00:00.000Z" },
    categories: ids.flatMap(createCategories),
    records: ids.flatMap(createRecords),
    cards: ids.flatMap(createCards),
    suppliers: ids.flatMap(createSuppliers),
    reports: ids.flatMap(createReports),
    switchLog: [],
  };
}

function loadState(): BookState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as BookState;
  } catch { /* fall back to seed */ }
  return createSeedState();
}

export function calcCard(card: CostCard) {
  const material = card.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cost = Number((material + card.labor + card.overhead).toFixed(2));
  const marginRate = card.salePrice ? Number(((card.salePrice - cost) / card.salePrice * 100).toFixed(1)) : 0;
  return { material, cost, marginRate };
}

const dateLabel = (date: string) => date === "2026-07-14" ? "今天" : date === "2026-07-13" ? "昨天" : date.slice(5).replace("-", " 月 ") + " 日";

export function useCostBook() {
  const [state, setState] = useState<BookState>(loadState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeIndustryId = state.workspace.activeIndustryId;
  const template = industryTemplates[activeIndustryId];
  const categories = useMemo(() => state.categories.filter((item) => item.industryId === activeIndustryId && !item.archived), [state.categories, activeIndustryId]);
  const records = useMemo(() => state.records.filter((item) => item.industryId === activeIndustryId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [state.records, activeIndustryId]);
  const cards = useMemo(() => state.cards.filter((item) => item.industryId === activeIndustryId), [state.cards, activeIndustryId]);
  const suppliers = useMemo(() => state.suppliers.filter((item) => item.industryIds.includes(activeIndustryId) || item.industryIds.includes("shared")), [state.suppliers, activeIndustryId]);
  const reports = useMemo(() => state.reports.filter((item) => item.industryId === activeIndustryId).sort((a, b) => b.month.localeCompare(a.month)), [state.reports, activeIndustryId]);

  const totals = useMemo(() => {
    const expenses = records.filter((record) => record.type !== "income").reduce((sum, record) => sum + record.amount, 0);
    const incomeRecords = records.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amount, 0);
    const revenue = template.baselineRevenue + incomeRecords;
    const budget = state.workspace.budgetByIndustry[activeIndustryId];
    const categoryTotals = categories.map((category) => ({ ...category, amount: records.filter((record) => record.categoryKey === category.key && record.type !== "income").reduce((sum, record) => sum + record.amount, 0) }));
    const totalCost = categoryTotals.reduce((sum, category) => sum + category.amount, 0);
    const marginRate = revenue ? Number(((revenue - totalCost) / revenue * 100).toFixed(1)) : 0;
    return { totalCost: expenses || totalCost, revenue, budget, budgetUsed: budget ? Math.min(totalCost / budget * 100, 100) : 0, marginRate, categoryTotals, incomeRecords };
  }, [records, categories, state.workspace.budgetByIndustry, activeIndustryId, template.baselineRevenue]);

  const trend = useMemo(() => {
    const current = totals.totalCost;
    return [5, 4, 3, 2, 1, 0].map((offset) => {
      const cost = Math.round(current * (1 - offset * .045));
      const revenue = Math.round(totals.revenue * (1 - offset * .032));
      return { month: `2026-${String(7 - offset).padStart(2, "0")}`, cost, revenue, marginRate: revenue ? Number(((revenue - cost) / revenue * 100).toFixed(1)) : 0 };
    });
  }, [totals.totalCost, totals.revenue]);

  const hiddenCosts = useMemo(() => template.hiddenCost.map((rule) => {
    const base = rule.basisKeys.reduce((sum, key) => sum + (key === "revenue" ? totals.revenue : totals.categoryTotals.find((category) => category.key === key)?.amount || 0), 0);
    const estimate = Math.round(base * rule.rate);
    const health = estimate / Math.max(totals.revenue, 1) < .04 ? 85 : estimate / Math.max(totals.revenue, 1) < .08 ? 72 : 54;
    return { ...rule, base, estimate, health };
  }), [template.hiddenCost, totals.categoryTotals, totals.revenue]);

  const switchIndustry = (targetIndustryId: IndustryId) => {
    if (targetIndustryId === activeIndustryId) return;
    setState((current) => ({ ...current, workspace: { ...current.workspace, activeIndustryId: targetIndustryId, switchedAt: now() }, switchLog: [{ id: uid("switch"), from: current.workspace.activeIndustryId, to: targetIndustryId, at: now(), strategy: "future_only" }, ...current.switchLog] }));
  };

  const addRecord = (input: Omit<CostRecord, "id" | "workspaceId" | "industryId" | "createdAt">) => {
    setState((current) => ({ ...current, records: [{ ...input, id: uid("record"), workspaceId: WORKSPACE_ID, industryId: current.workspace.activeIndustryId, createdAt: now() }, ...current.records] }));
  };

  const updateRecord = (id: string, input: Partial<Omit<CostRecord, "id" | "workspaceId" | "industryId" | "createdAt">>) => {
    setState((current) => ({ ...current, records: current.records.map((record) => record.id === id ? { ...record, ...input } : record) }));
  };

  const removeRecord = (id: string) => setState((current) => ({ ...current, records: current.records.filter((record) => record.id !== id) }));

  const addBomItem = (cardId: string, item: Omit<BomItem, "id">) => {
    setState((current) => ({ ...current, cards: current.cards.map((card) => card.id === cardId ? { ...card, items: [...card.items, { ...item, id: uid("bom") }], history: [...card.history.slice(-5), calcCard({ ...card, items: [...card.items, { ...item, id: "new" }] }).cost] } : card) }));
  };

  const removeBomItem = (cardId: string, itemId: string) => {
    setState((current) => ({ ...current, cards: current.cards.map((card) => card.id === cardId ? { ...card, items: card.items.filter((item) => item.id !== itemId), history: [...card.history.slice(-5), calcCard({ ...card, items: card.items.filter((item) => item.id !== itemId) }).cost] } : card) }));
  };

  const addSupplier = (input: Omit<Supplier, "id" | "workspaceId" | "industryIds" | "spend" | "orders" | "trend">) => {
    setState((current) => ({ ...current, suppliers: [...current.suppliers, { ...input, id: uid("supplier"), workspaceId: WORKSPACE_ID, industryIds: [current.workspace.activeIndustryId], spend: 0, orders: 0, trend: "up" }] }));
  };

  const removeSupplier = (id: string) => setState((current) => ({ ...current, suppliers: current.suppliers.filter((supplier) => supplier.id !== id) }));

  const addCategory = (input: Omit<Category, "id" | "workspaceId" | "industryId">) => {
    setState((current) => ({ ...current, categories: [...current.categories, { ...input, id: uid("category"), workspaceId: WORKSPACE_ID, industryId: current.workspace.activeIndustryId }] }));
  };

  const removeCategory = (id: string) => {
    const category = state.categories.find((item) => item.id === id);
    if (!category) return { ok: false, reason: "分类不存在" };
    if (state.records.some((record) => record.industryId === activeIndustryId && record.categoryKey === category.key)) return { ok: false, reason: "该分类下仍有关联流水，无法删除" };
    setState((current) => ({ ...current, categories: current.categories.filter((item) => item.id !== id) }));
    return { ok: true };
  };

  const updateBudget = (budget: number) => setState((current) => ({ ...current, workspace: { ...current.workspace, budgetByIndustry: { ...current.workspace.budgetByIndustry, [current.workspace.activeIndustryId]: budget } } }));

  return {
    state, activeIndustryId, template, categories, records, cards, suppliers, reports, totals, trend, hiddenCosts,
    dateLabel, switchIndustry, addRecord, updateRecord, removeRecord, addBomItem, removeBomItem, addSupplier, removeSupplier, addCategory, removeCategory, updateBudget,
  };
}
