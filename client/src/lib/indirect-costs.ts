/**
 * 间接成本池的纯计算内核。
 * 该模块只处理管理口径的项目分配，不改变经营流水的正式利润口径。
 */

export type IndirectCostKind = "rent" | "utilities" | "stall_fee" | "base_labor" | "depreciation" | "custom";
export type IndirectCostSource = "actual" | "planned";
export type IndirectCostAllocationMode = "allocated" | "unallocated";
export type IndirectCostAllocationMethod = "units" | "revenue" | "equal" | "manual";

export type IndirectCostTarget = { cardId: string; manualWeight?: number };

export type IndirectCostPool = {
  id: string;
  workspaceId: string;
  industryId: string;
  name: string;
  kind: IndirectCostKind;
  amountFen: number;
  occurredAt: string;
  categoryKey: string;
  source: IndirectCostSource;
  allocationMode: IndirectCostAllocationMode;
  allocationMethod: IndirectCostAllocationMethod;
  targets: IndirectCostTarget[];
  sourceEntryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAllocationDriver = { cardId: string; soldUnits: number; salesFen: number };
export type IndirectCostAllocation = {
  poolId: string;
  cardId: string;
  amountFen: number;
  perSoldUnitFen: number | null;
  source: IndirectCostSource;
};

export const indirectCostKindLabel: Record<IndirectCostKind, string> = {
  rent: "房租",
  utilities: "水电物业",
  stall_fee: "摊位费",
  base_labor: "基础人工",
  depreciation: "设备折旧",
  custom: "其他间接成本",
};

export const indirectCostAllocationMethodLabel: Record<IndirectCostAllocationMethod, string> = {
  units: "按销量",
  revenue: "按营业额",
  equal: "按项目数",
  manual: "自定义比例",
};

function weightsFor(pool: IndirectCostPool, drivers: ProjectAllocationDriver[]) {
  const driverMap = new Map(drivers.map((driver) => [driver.cardId, driver]));
  return pool.targets.map((target) => {
    const driver = driverMap.get(target.cardId);
    if (pool.allocationMethod === "units") return Math.max(0, driver?.soldUnits || 0);
    if (pool.allocationMethod === "revenue") return Math.max(0, driver?.salesFen || 0);
    if (pool.allocationMethod === "manual") return Math.max(0, target.manualWeight || 0);
    return 1;
  });
}

/**
 * 返回精确到分的当期项目分摊。分摊关闭、缺少目标或缺少所需动因时返回空数组，
 * 不会悄悄用均摊替代用户已选的销量/营业额规则。
 */
export function allocateIndirectCost(pool: IndirectCostPool, drivers: ProjectAllocationDriver[]): IndirectCostAllocation[] {
  if (pool.allocationMode !== "allocated" || pool.amountFen <= 0 || !pool.targets.length) return [];
  const weights = weightsFor(pool, drivers);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return [];
  const driverMap = new Map(drivers.map((driver) => [driver.cardId, driver]));
  let remainingFen = pool.amountFen;
  return pool.targets.map((target, index) => {
    const isLast = index === pool.targets.length - 1;
    // 分是可持久化的最小金额单位：非最后一项采用最近分，最后一项承接余额，避免系统性向下取整并确保总额守恒。
    const nearestFen = Math.round(pool.amountFen * weights[index] / totalWeight);
    const amountFen = isLast ? remainingFen : Math.min(remainingFen, nearestFen);
    remainingFen -= amountFen;
    const soldUnits = driverMap.get(target.cardId)?.soldUnits || 0;
    return {
      poolId: pool.id,
      cardId: target.cardId,
      amountFen,
      perSoldUnitFen: soldUnits > 0 ? Math.round(amountFen / soldUnits) : null,
      source: pool.source,
    };
  });
}

export function buildIndirectCostAllocations(pools: IndirectCostPool[], drivers: ProjectAllocationDriver[]) {
  return pools.flatMap((pool) => allocateIndirectCost(pool, drivers));
}

export function indirectCostUnitFenByCard(allocations: IndirectCostAllocation[]) {
  return allocations.reduce<Record<string, number>>((result, allocation) => {
    if (allocation.perSoldUnitFen === null) return result;
    result[allocation.cardId] = (result[allocation.cardId] || 0) + allocation.perSoldUnitFen;
    return result;
  }, {});
}

export function validateManualWeights(targets: IndirectCostTarget[]) {
  const total = targets.reduce((sum, target) => sum + Math.max(0, target.manualWeight || 0), 0);
  return Number(total.toFixed(2)) === 100;
}
