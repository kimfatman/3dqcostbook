/** 以用户设备本地时区生成业务日期，避免 UTC 零点导致账期提前或延后。 */
export function businessDate(value = new Date(), timezoneOffsetMinutes = value.getTimezoneOffset()) {
  return new Date(value.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function businessPeriod(value = new Date(), timezoneOffsetMinutes = value.getTimezoneOffset()) {
  return businessDate(value, timezoneOffsetMinutes).slice(0, 7);
}
