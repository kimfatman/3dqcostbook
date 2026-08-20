/**
 * P0 首页经营判断模型：只整理既有账本结果的展示优先级，不参与收入、成本、预算或订单利润计算。
 * 视觉规范：行业—成本—预算—唯一优先风险在同一经营判断簇内完成阅读。
 */
export type HomeDecisionTarget = "budget" | "orders" | "cards" | "records";
export type HomeRiskTone = "notice" | "attention" | "risk";
export type HomeBudgetState = "healthy" | "risk" | "over";

export type HomeDecisionNotification = {
  id: string;
  tone: HomeRiskTone;
  title: string;
  action: string;
  target: HomeDecisionTarget;
};

export type HomeDecision = {
  context: { industryLabel: string; period: string };
  result: { label: "经营利润" | "经营亏损"; amount: number };
  metrics: Array<{
    key: "revenue" | "cost" | "budget";
    label: string;
    amount: number;
    tone: "normal" | "attention" | "risk";
  }>;
  priority: HomeDecisionNotification | null;
};

type HomeDecisionInput = {
  industryLabel: string;
  period: string;
  revenue: number;
  cost: number;
  operatingProfit: number;
  budgetRemaining: number;
  budgetState: HomeBudgetState;
  budget: number;
  budgetForecast: number;
  notifications: HomeDecisionNotification[];
};

function priorityRank(item: HomeDecisionNotification) {
  if (item.id === "budget-over") return 10;
  if (item.id === "order-warning") return 20;
  if (item.id.startsWith("card-") && item.tone === "risk") return 30;
  if (item.id === "budget-risk") return 40;
  if (item.id.startsWith("card-")) return 45;
  if (item.id === "refund-watch") return 50;
  return 99;
}

export function buildHomeDecision(input: HomeDecisionInput): HomeDecision {
  const budgetAmount = input.budgetState === "healthy"
    ? Math.max(0, input.budgetRemaining)
    : input.budgetState === "over"
      ? Math.abs(Math.min(0, input.budgetRemaining))
      : Math.max(0, input.budgetForecast - input.budget);

  const priority = input.notifications
    .filter((item) => item.tone !== "notice")
    .sort((first, second) => priorityRank(first) - priorityRank(second))[0] ?? null;

  return {
    context: { industryLabel: input.industryLabel, period: input.period },
    result: {
      label: input.operatingProfit >= 0 ? "经营利润" : "经营亏损",
      amount: Math.abs(input.operatingProfit),
    },
    metrics: [
      { key: "revenue", label: "净营收", amount: input.revenue, tone: "normal" },
      { key: "cost", label: "本月成本", amount: input.cost, tone: "normal" },
      {
        key: "budget",
        label: input.budgetState === "over" ? "预算已超" : input.budgetState === "risk" ? "月末预计超" : "预算剩余",
        amount: budgetAmount,
        tone: input.budgetState === "healthy" ? "normal" : input.budgetState === "over" ? "risk" : "attention",
      },
    ],
    priority,
  };
}
