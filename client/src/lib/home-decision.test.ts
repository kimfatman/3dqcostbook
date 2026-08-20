import { describe, expect, it } from "vitest";
import { buildHomeDecision, type HomeDecisionNotification } from "./home-decision";

const base = {
  industryLabel: "电商",
  period: "2026-07",
  revenue: 1200,
  cost: 900,
  operatingProfit: 300,
  budgetRemaining: 100,
  budgetState: "healthy" as const,
  budget: 1000,
  budgetForecast: 900,
  notifications: [] as HomeDecisionNotification[],
};

describe("首页经营判断", () => {
  it("预算超支优先于其余经营提醒", () => {
    const decision = buildHomeDecision({
      ...base,
      budgetRemaining: -120,
      budgetState: "over",
      notifications: [
        { id: "order-warning", tone: "risk", title: "2 笔订单低于利润目标", action: "查看低利润订单", target: "orders" },
        { id: "budget-over", tone: "risk", title: "预算已超 ¥120", action: "查看预算结构", target: "budget" },
      ],
    });

    expect(decision.metrics[2]).toMatchObject({ label: "预算已超", amount: 120, tone: "risk" });
    expect(decision.priority?.id).toBe("budget-over");
  });

  it("预算健康时低利润订单成为最高优先风险", () => {
    const decision = buildHomeDecision({
      ...base,
      notifications: [
        { id: "budget-steady", tone: "notice", title: "月末预计结余 ¥100", action: "查看预算进度", target: "budget" },
        { id: "order-warning", tone: "risk", title: "1 笔订单低于利润目标", action: "查看低利润订单", target: "orders" },
      ],
    });

    expect(decision.metrics[2]).toMatchObject({ label: "预算剩余", amount: 100, tone: "normal" });
    expect(decision.priority?.id).toBe("order-warning");
  });

  it("月末预算风险展示预测超额而不是当前剩余预算", () => {
    const decision = buildHomeDecision({
      ...base,
      budgetRemaining: 80,
      budgetState: "risk",
      budget: 1000,
      budgetForecast: 1135,
      notifications: [{ id: "budget-risk", tone: "attention", title: "月末预计超预算 ¥135", action: "查看预算预测", target: "budget" }],
    });

    expect(decision.metrics[2]).toMatchObject({ label: "月末预计超", amount: 135, tone: "attention" });
    expect(decision.priority?.id).toBe("budget-risk");
  });

  it("无风险时仍保留核算指标但不渲染优先行动", () => {
    const decision = buildHomeDecision(base);
    expect(decision.priority).toBeNull();
    expect(decision.metrics).toHaveLength(3);
  });

  it("亏损用绝对值金额和明确结果文案呈现", () => {
    const decision = buildHomeDecision({ ...base, operatingProfit: -48 });
    expect(decision.result).toEqual({ label: "经营亏损", amount: 48 });
  });
});
