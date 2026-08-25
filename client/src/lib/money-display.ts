export function formatMoneyCompact(amount: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "-" : "";
  return `${sign}¥${new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(safeAmount))}`;
}
