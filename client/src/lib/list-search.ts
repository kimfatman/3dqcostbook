/**
 * 账本列表检索：统一处理月份边界与中文/英文关键词匹配，供流水和订单界面共用。
 */
export function matchesMonth(date: string, selectedMonth: string) {
  return selectedMonth === "all" || date.startsWith(selectedMonth);
}

export function availableMonths(dates: readonly string[]) {
  return Array.from(new Set(dates.map((date) => date.slice(0, 7)))).sort().reverse();
}

export function matchesQuery(values: readonly string[], query: string) {
  const keyword = query.trim().toLocaleLowerCase();
  return !keyword || values.some((value) => value.toLocaleLowerCase().includes(keyword));
}
