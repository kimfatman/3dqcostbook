export const homeTimeRangeOptions = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
] as const;

export type HomeTimeRange = (typeof homeTimeRangeOptions)[number]["value"];

export type HomeTimeRangeWindow = {
  value: HomeTimeRange;
  label: string;
  dateLabel: string;
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  comparisonLabel: "较昨日" | "较上周同期" | "较上月同期";
};

function parseDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function offsetDate(date: string, days: number) {
  const point = parseDate(date);
  point.setUTCDate(point.getUTCDate() + days);
  return dateKey(point);
}

function previousMonthDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1, 12));
  const previousYear = previous.getUTCFullYear();
  const previousMonth = previous.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(previousYear, previousMonth, 0, 12)).getUTCDate();
  return dateKey(new Date(Date.UTC(previousYear, previousMonth - 1, Math.min(day, lastDay), 12)));
}

function shortDate(date: string) {
  const [, month, day] = date.slice(0, 10).split("-").map(Number);
  return `${month}月${day}日`;
}

function rangeLabel(startDate: string, endDate: string) {
  return startDate === endDate ? shortDate(startDate) : `${shortDate(startDate)}–${shortDate(endDate)}`;
}

/**
 * 首页主卡的展示范围。日期键始终是设备本地业务日生成的 YYYY-MM-DD，
 * 此处仅做日历区间解析，不参与交易、退款或金额口径计算。
 */
export function buildHomeTimeRange(anchorDate: string, value: HomeTimeRange): HomeTimeRangeWindow {
  const endDate = anchorDate.slice(0, 10);
  if (value === "today") {
    const previous = offsetDate(endDate, -1);
    return { value, label: "今天", dateLabel: `今天 · ${shortDate(endDate)}`, startDate: endDate, endDate, previousStartDate: previous, previousEndDate: previous, comparisonLabel: "较昨日" };
  }
  if (value === "week") {
    const day = parseDate(endDate).getUTCDay();
    const startDate = offsetDate(endDate, -((day + 6) % 7));
    return { value, label: "本周", dateLabel: `本周 · ${rangeLabel(startDate, endDate)}`, startDate, endDate, previousStartDate: offsetDate(startDate, -7), previousEndDate: offsetDate(endDate, -7), comparisonLabel: "较上周同期" };
  }
  const startDate = `${endDate.slice(0, 7)}-01`;
  const previousEndDate = previousMonthDate(endDate);
  return { value, label: "本月", dateLabel: `本月 · ${rangeLabel(startDate, endDate)}`, startDate, endDate, previousStartDate: `${previousEndDate.slice(0, 7)}-01`, previousEndDate, comparisonLabel: "较上月同期" };
}

export function isInHomeTimeRange(date: string, range: Pick<HomeTimeRangeWindow, "startDate" | "endDate">) {
  const key = date.slice(0, 10);
  return key >= range.startDate && key <= range.endDate;
}

export function filterByHomeTimeRange<T extends { occurredAt: string }>(items: T[], range: Pick<HomeTimeRangeWindow, "startDate" | "endDate">) {
  return items.filter((item) => isInHomeTimeRange(item.occurredAt, range));
}
