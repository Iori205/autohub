import { MOCK_TODAY } from "./data/seed";
import { MONTHS, addDays, shortDate } from "./format";
import { isLive, stockLevel } from "./status";
import type { Category, Customer, Order, OrderStatus, Product } from "./types";

/*
 * Derived numbers. Every page computes its figures through these helpers from
 * the same orders/products, so the dashboard, reports, customers and inventory
 * always agree. "Revenue" = order total (items + delivery) of orders whose
 * payment was received and not refunded.
 */

export const TODAY = MOCK_TODAY;

const day = (o: Order) => o.createdAt.slice(0, 10);

export const inRange = (o: Order, from: string, to: string) => day(o) >= from && day(o) <= to;

export const revenue = (orders: Order[]) =>
  orders.filter(isLive).reduce((a, o) => a + o.total, 0);

/** Last `n` days ending at `end` (inclusive), oldest first. */
export const lastDays = (n: number, end = TODAY) =>
  Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));

export function dailyRevenue(orders: Order[], days: string[]) {
  const map = new Map(days.map((d) => [d, 0]));
  for (const o of orders) if (isLive(o) && map.has(day(o))) map.set(day(o), map.get(day(o))! + o.total);
  return days.map((d) => map.get(d)!);
}

export function statusCounts(orders: Order[]) {
  const counts = {} as Record<OrderStatus, number>;
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
  return counts;
}

export interface SplitRow {
  name: string;
  value: number;
  share: number;
}

/** Revenue split by product category or brand; delivery fees get their own row so the rows sum to revenue. */
export function revenueSplit(
  orders: Order[],
  products: Product[],
  categories: Category[],
  by: "category" | "brand",
): SplitRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const catName = new Map(categories.map((c) => [c.key, c.name]));
  const agg = new Map<string, number>();
  let delivery = 0;
  for (const o of orders) {
    if (!isLive(o)) continue;
    delivery += o.shipping;
    for (const it of o.items) {
      const p = byId.get(it.productId);
      const key = !p ? "Бусад" : by === "brand" ? p.brand : (catName.get(p.category) ?? "Бусад");
      agg.set(key, (agg.get(key) ?? 0) + it.price * it.qty);
    }
  }
  const rows = [...agg.entries()].sort((a, b) => b[1] - a[1]);
  if (delivery) rows.push(["Хүргэлтийн төлбөр", delivery]);
  const total = rows.reduce((a, [, v]) => a + v, 0) || 1;
  return rows.map(([name, value]) => ({ name, value, share: value / total }));
}

export interface ProductSales {
  product: Product;
  qty: number;
  revenue: number;
}

export function productSales(orders: Order[], products: Product[]): ProductSales[] {
  const agg = new Map<number, { qty: number; revenue: number }>();
  for (const o of orders) {
    if (!isLive(o)) continue;
    for (const it of o.items) {
      const a = agg.get(it.productId) ?? { qty: 0, revenue: 0 };
      a.qty += it.qty;
      a.revenue += it.price * it.qty;
      agg.set(it.productId, a);
    }
  }
  return products
    .map((product) => ({ product, ...(agg.get(product.id) ?? { qty: 0, revenue: 0 }) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface CustomerStats {
  orders: Order[];
  live: number;
  spent: number;
  last: string | null;
}

export function customerStats(orders: Order[]) {
  const map = new Map<string, CustomerStats>();
  for (const o of orders) {
    const s = map.get(o.customerId) ?? { orders: [], live: 0, spent: 0, last: null };
    s.orders.push(o);
    if (isLive(o)) {
      s.live++;
      s.spent += o.total;
    }
    if (!s.last || o.createdAt > s.last) s.last = o.createdAt;
    map.set(o.customerId, s);
  }
  return map;
}

export const customerById = (customers: Customer[]) => new Map(customers.map((c) => [c.id, c]));

export const lowStock = (products: Product[]) =>
  products.filter((p) => stockLevel(p) !== "ok").sort((a, b) => a.stock / (a.threshold || 1) - b.stock / (b.threshold || 1));

/** Orders that were paid and wait for someone to start preparing them. */
export const toProcess = (orders: Order[]) => orders.filter((o) => o.status === "paid");

/* ---------- reports ---------- */

export type Period = "day" | "week" | "month";

export interface ReportRow {
  label: string;
  short: string;
  from: string;
  to: string;
  orders: number;
  revenue: number;
}

export function reportBuckets(period: Period, today = TODAY): Omit<ReportRow, "orders" | "revenue">[] {
  if (period === "day")
    return lastDays(14, today).map((d) => ({ label: `${d.replace(/-/g, ".")}`, short: shortDate(d), from: d, to: d }));
  if (period === "week") {
    // Monday-based weeks; the current week is partial.
    const t = new Date(today + "T00:00");
    const monday = addDays(today, -((t.getDay() + 6) % 7));
    return Array.from({ length: 12 }, (_, i) => {
      const from = addDays(monday, (i - 11) * 7);
      const to = i === 11 ? today : addDays(from, 6);
      return { label: `${shortDate(from)}–${shortDate(to)}`, short: shortDate(from), from, to };
    });
  }
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const end = `${from.slice(0, 8)}${String(last).padStart(2, "0")}`;
    return {
      label: `${d.getFullYear()} · ${MONTHS[d.getMonth()]}`,
      short: MONTHS[d.getMonth()]!,
      from,
      to: end < today ? end : today,
    };
  });
}

export function report(orders: Order[], period: Period, today = TODAY): ReportRow[] {
  return reportBuckets(period, today).map((b) => {
    const live = orders.filter((o) => isLive(o) && inRange(o, b.from, b.to));
    return { ...b, orders: live.length, revenue: live.reduce((a, o) => a + o.total, 0) };
  });
}
