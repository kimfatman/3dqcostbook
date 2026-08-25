type ChannelTemplateInput = {
  commissionRatePct: number;
  fulfillmentCost: number;
  targetContributionMarginPct: number;
};

type BomAmountInput = { name: string; quantity: string; amount: number };

const ok = { ok: true as const };
const fail = (reason: string) => ({ ok: false as const, reason });
const finite = (value: number) => Number.isFinite(value);

export function validateHealthSettingsInput(input: { targetOperatingMarginPct: number; refundTolerancePct: number }) {
  if (!finite(input.targetOperatingMarginPct) || input.targetOperatingMarginPct < 0 || input.targetOperatingMarginPct > 100) return fail("目标经营利润率必须在 0–100% 之间");
  if (!finite(input.refundTolerancePct) || input.refundTolerancePct < 0 || input.refundTolerancePct > 100) return fail("退款容忍率必须在 0–100% 之间");
  return ok;
}

export function validateChannelPricingInput(input: ChannelTemplateInput) {
  if (!finite(input.commissionRatePct) || input.commissionRatePct < 0 || input.commissionRatePct > 99.9) return fail("渠道综合费率必须在 0–99.9% 之间");
  if (!finite(input.targetContributionMarginPct) || input.targetContributionMarginPct < 0 || input.targetContributionMarginPct > 99.9) return fail("目标贡献毛利率必须在 0–99.9% 之间");
  if (input.commissionRatePct + input.targetContributionMarginPct >= 100) return fail("渠道费率与目标贡献毛利率之和必须小于 100%");
  if (!finite(input.fulfillmentCost) || input.fulfillmentCost < 0) return fail("单件履约费用必须是非负金额");
  return ok;
}

export function validateBomAmountInput(input: BomAmountInput) {
  if (!input.name.trim()) return fail("请填写成本项名称");
  if (!input.quantity.trim()) return fail("请填写成本项数量");
  if (!finite(input.amount) || input.amount <= 0) return fail("材料金额必须是大于 0 的有效金额");
  return ok;
}

export function validateCostCardInput(input: { salePrice: number; labor: number; overhead: number; items: BomAmountInput[] }) {
  if (!finite(input.salePrice) || input.salePrice <= 0) return fail("销售单价必须是大于 0 的有效金额");
  if (!finite(input.labor) || input.labor < 0 || !finite(input.overhead) || input.overhead < 0) return fail("人工与制造费用必须是非负有效金额");
  if (!input.items.length) return fail("请至少保留一项材料");
  const invalid = input.items.map(validateBomAmountInput).find((result) => !result.ok);
  return invalid || ok;
}
