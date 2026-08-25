import { describe, expect, it } from "vitest";
import { allocateIndirectCost, indirectCostUnitFenByCard, validateManualWeights, type IndirectCostPool } from "./indirect-costs";

const pool = (overrides: Partial<IndirectCostPool> = {}): IndirectCostPool => ({
  id: "pool-1", workspaceId: "workspace-1", industryId: "stall", name: "本月摊位费", kind: "stall_fee", amountFen: 90000,
  occurredAt: "2026-08-01", categoryKey: "stall_fee", source: "actual", allocationMode: "allocated", allocationMethod: "units",
  targets: [{ cardId: "a" }, { cardId: "b" }], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", ...overrides,
});

describe("间接成本池分摊", () => {
  it("按销量分配并给出每件分摊，分额精确保持总额一致", () => {
    const allocations = allocateIndirectCost(pool(), [{ cardId: "a", soldUnits: 30, salesFen: 36000 }, { cardId: "b", soldUnits: 70, salesFen: 84000 }]);
    expect(allocations.map((item) => item.amountFen)).toEqual([27000, 63000]);
    expect(allocations.map((item) => item.perSoldUnitFen)).toEqual([900, 900]);
  });

  it("暂不摊销或缺少销量时不伪造项目成本", () => {
    expect(allocateIndirectCost(pool({ allocationMode: "unallocated" }), [{ cardId: "a", soldUnits: 1, salesFen: 1 }])).toEqual([]);
    expect(allocateIndirectCost(pool(), [{ cardId: "a", soldUnits: 0, salesFen: 0 }, { cardId: "b", soldUnits: 0, salesFen: 0 }])).toEqual([]);
  });

  it("支持项目数均分和人工比例，并只把有销量的分配折算为单件成本", () => {
    const equal = allocateIndirectCost(pool({ allocationMethod: "equal", amountFen: 101 }), [{ cardId: "a", soldUnits: 1, salesFen: 0 }, { cardId: "b", soldUnits: 0, salesFen: 0 }]);
    expect(equal.map((item) => item.amountFen)).toEqual([50, 51]);
    expect(indirectCostUnitFenByCard(equal)).toEqual({ a: 50 });
    expect(validateManualWeights([{ cardId: "a", manualWeight: 65 }, { cardId: "b", manualWeight: 35 }])).toBe(true);
    expect(validateManualWeights([{ cardId: "a", manualWeight: 60 }, { cardId: "b", manualWeight: 35 }])).toBe(false);
  });

  it("编辑金额和规则后会用新口径重新计算项目单位分摊，不影响既有订单快照", () => {
    const drivers = [{ cardId: "a", soldUnits: 30, salesFen: 36000 }, { cardId: "b", soldUnits: 70, salesFen: 84000 }];
    const historicalOrderLine = Object.freeze({ skuId: "sku-a", unitCostFen: 3290 });
    const edited = pool({ amountFen: 180000, source: "planned", allocationMethod: "revenue" });
    const unitFen = indirectCostUnitFenByCard(allocateIndirectCost(edited, drivers));
    expect(unitFen).toEqual({ a: 1800, b: 1800 });
    expect(historicalOrderLine.unitCostFen).toBe(3290);
  });

  it("删除成本池或暂不摊销不会伪造分配；重新启用且有基数时才产生项目成本", () => {
    const drivers = [{ cardId: "a", soldUnits: 10, salesFen: 10000 }, { cardId: "b", soldUnits: 10, salesFen: 10000 }];
    const disabled = pool({ allocationMode: "unallocated" });
    expect(allocateIndirectCost(disabled, drivers)).toEqual([]);
    expect(allocateIndirectCost(pool(), drivers)).toHaveLength(2);
    expect(allocateIndirectCost(pool(), [])).toEqual([]);
    expect(indirectCostUnitFenByCard([])).toEqual({});
  });
});
