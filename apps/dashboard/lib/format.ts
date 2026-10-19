/** "1,234,000₮" — same formatting as the storefront. */
export const money = (n: number) =>
  Math.round(n || 0).toLocaleString("en-US") + "₮";

export const num = (n: number) => Math.round(n || 0).toLocaleString("en-US");

/** "12.4 сая₮" */
export const millions = (n: number, unit = " сая₮") => (n / 1e6).toFixed(1) + unit;

const pad = (n: number) => String(n).padStart(2, "0");

/** Timestamps are stored as local "YYYY-MM-DD HH:mm" strings. */
export const parseTs = (ts: string) => new Date(ts.replace(" ", "T"));

export const toTs = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addMinutes = (ts: string, min: number) => {
  const d = parseTs(ts);
  d.setMinutes(d.getMinutes() + min);
  return toTs(d);
};

export const addDays = (day: string, n: number) => {
  const d = new Date(day + "T00:00");
  d.setDate(d.getDate() + n);
  return toDay(d);
};

export const nowTs = () => toTs(new Date());

/** "10.11 14:32" */
export const shortDateTime = (ts: string) =>
  `${ts.slice(5, 7)}.${ts.slice(8, 10)} ${ts.slice(11, 16)}`;

/** "10.11" */
export const shortDate = (ts: string) => `${ts.slice(5, 7)}.${ts.slice(8, 10)}`;

/** "2026.10.11" (+ " 14:32" when the value has a time) */
export const dotted = (ts: string) => ts.replace(/-/g, ".");

export const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
export const MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

export const weekday = (day: string) => WEEKDAYS[new Date(day + "T00:00").getDay()]!;

/** "ГБ" from "Ганболд Батбаяр", "Бат-Эрдэнэ Ганбаатар" → "БГ" */
export const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Short form used for staff: "Ганболд Б." */
export const shortName = (name: string) => {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : name;
};

export const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);

export const signed = (n: number) => (n > 0 ? "+" : "") + n + "%";

export const digits = (s: string) => s.replace(/\D/g, "");

const UB_OFFSET_MS = 8 * 3600_000;

/** ISO timestamp from the API → Ulaanbaatar local "YYYY-MM-DD HH:mm" (UTC+8, no DST). */
export const ubTs = (iso: string) => new Date(Date.parse(iso) + UB_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");

/** Today's date in Ulaanbaatar, "YYYY-MM-DD". */
export const ubToday = () => new Date(Date.now() + UB_OFFSET_MS).toISOString().slice(0, 10);
