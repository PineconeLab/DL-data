const isoDate = /^\d{4}-\d{2}-\d{2}$/;
export function isDateOnly(value: string) {
  if (!isoDate.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01" &&
    value <= "2199-12-31"
  );
}
export function shanghaiToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)!.value)
    .join("-");
}
export function daysTogether(start: string, today = shanghaiToday()) {
  if (!isDateOnly(start) || !isDateOnly(today) || start > today) return null;
  return (
    Math.round(
      (Date.parse(today + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
        86400000,
    ) + 1
  );
}
export function displayDate(value: string) {
  return value.replaceAll("-", ".");
}
export function displayTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)),
    offset = (first.getUTCDay() + 6) % 7,
    count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [
    ...Array(offset).fill(null),
    ...Array.from(
      { length: count },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ] as (string | null)[];
}
export function shiftMonth(month: string, step: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + step, 1)).toISOString().slice(0, 7);
}
