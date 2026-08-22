export function formatMoneyCompact(amount: number) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  if (absolute >= 100_000_000) return `${sign}¥${trimDecimal(absolute / 100_000_000)}亿`;
  if (absolute >= 10_000) return `${sign}¥${trimDecimal(absolute / 10_000)}万`;
  return `${sign}¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(absolute)}`;
}

function trimDecimal(value: number) {
  return value.toFixed(value >= 1000 ? 0 : 1).replace(/\.0$/, "");
}
