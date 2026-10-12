import { prisma, Prisma } from "@repo/db";
import {
  orderStage,
  type OrderStage,
  type OverviewDto,
  type ReportDto,
  type ReportRowDto,
  type SplitRowDto,
} from "@repo/types";
import { addDays, ubDay, ubEnd, ubStart } from "./time";

/*
 * Numbers for the dashboard and reports. Revenue = total (items + delivery)
 * of PAID orders, by the Ulaanbaatar day the order was placed — the same rule
 * the dashboard used with mock data, so pages keep agreeing.
 */

const MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
const short = (day: string) => `${day.slice(5, 7)}.${day.slice(8, 10)}`;

/** Paid revenue and order count per UB day in [from, to]. */
async function daily(from: string, to: string) {
  const rows = await prisma.$queryRaw<{ day: string; revenue: bigint; orders: bigint }[]>`
    -- createdAt is stored as UTC without a zone; UB is UTC+8 all year (no DST)
    SELECT to_char(("createdAt" + interval '8 hours')::date, 'YYYY-MM-DD') AS day,
           SUM(total)::bigint AS revenue, COUNT(*)::bigint AS orders
    FROM "Order"
    WHERE "paymentStatus" = 'PAID' AND "createdAt" >= ${ubStart(from)} AND "createdAt" < ${ubEnd(to)}
    GROUP BY 1`;
  return new Map(rows.map((r) => [r.day, { revenue: Number(r.revenue), orders: Number(r.orders) }]));
}

/** Item revenue split by category or brand (paid orders), plus a delivery-fee row so it sums to revenue. */
async function split(by: "category" | "brand", from: string, to: string): Promise<SplitRowDto[]> {
  const col = by === "category" ? Prisma.sql`c.name` : Prisma.sql`b.name`;
  const rows = await prisma.$queryRaw<{ name: string | null; value: bigint }[]>`
    SELECT ${col} AS name, SUM(i.price * i.qty)::bigint AS value
    FROM "OrderItem" i
    JOIN "Order" o ON o.id = i."orderId"
    LEFT JOIN "Product" p ON p.id = i."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE o."paymentStatus" = 'PAID' AND o."createdAt" >= ${ubStart(from)} AND o."createdAt" < ${ubEnd(to)}
    GROUP BY 1 ORDER BY 2 DESC`;
  const [fees] = await prisma.$queryRaw<{ value: bigint | null }[]>`
    SELECT SUM("shippingFee")::bigint AS value FROM "Order"
    WHERE "paymentStatus" = 'PAID' AND "createdAt" >= ${ubStart(from)} AND "createdAt" < ${ubEnd(to)}`;
  const list = rows.map((r) => ({ name: r.name ?? "Бусад", value: Number(r.value) }));
  if (Number(fees?.value ?? 0) > 0) list.push({ name: "Хүргэлтийн төлбөр", value: Number(fees!.value) });
  const total = list.reduce((a, r) => a + r.value, 0) || 1;
  return list.map((r) => ({ ...r, share: r.value / total }));
}

export async function overview(days: number, today = ubDay()): Promise<OverviewDto> {
  const yesterday = addDays(today, -1);
  const from = addDays(today, -(2 * days - 1));
  const map = await daily(from, today);
  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    return { day, revenue: map.get(day)?.revenue ?? 0 };
  });
  let previousTotal = 0;
  for (let i = 0; i < days; i++) previousTotal += map.get(addDays(today, -days - i))?.revenue ?? 0;

  const count = (day: string, extra: Prisma.OrderWhereInput = {}) =>
    prisma.order.count({ where: { createdAt: { gte: ubStart(day), lt: ubEnd(day) }, ...extra } });

  const [ordersToday, ordersYesterday, pendingAgg, pendingToday, toProcess, last7, products, todaysMoves] = await Promise.all([
    count(today),
    count(yesterday),
    prisma.order.aggregate({ where: { paymentStatus: "PENDING" }, _count: true, _sum: { total: true } }),
    count(today, { paymentStatus: "PENDING" }),
    prisma.order.count({ where: { paymentStatus: "PAID", deliveryStatus: "NONE" } }),
    prisma.order.findMany({
      where: { createdAt: { gte: ubStart(addDays(today, -6)), lt: ubEnd(today) } },
      select: { paymentStatus: true, deliveryStatus: true },
    }),
    prisma.product.findMany({ select: { id: true, stock: true, lowStockThreshold: true } }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: ubStart(today), lt: ubEnd(today) } },
      select: { productId: true, delta: true },
    }),
  ]);

  const low = (stock: number, t: number) => stock <= t; // includes out of stock
  const before = new Map(products.map((p) => [p.id, p.stock]));
  for (const m of todaysMoves) before.set(m.productId, (before.get(m.productId) ?? 0) - m.delta);

  const stageCounts = Object.fromEntries(
    ["pending", "paid", "preparing", "shipping", "delivered", "cancelled", "expired"].map((s) => [s, 0]),
  ) as Record<OrderStage, number>;
  for (const o of last7) stageCounts[orderStage(o)]++;

  const month = addDays(today, -29);
  const [cats, top] = await Promise.all([
    split("category", month, today),
    prisma.$queryRaw<{ productId: number; name: string; brand: string; oem: string | null; qty: bigint; revenue: bigint }[]>`
      SELECT p.id AS "productId", p.name, b.name AS brand, p."oemNumbers"[1] AS oem,
             SUM(i.qty)::bigint AS qty, SUM(i.price * i.qty)::bigint AS revenue
      FROM "OrderItem" i
      JOIN "Order" o ON o.id = i."orderId"
      JOIN "Product" p ON p.id = i."productId"
      JOIN "Brand" b ON b.id = p."brandId"
      WHERE o."paymentStatus" = 'PAID' AND o."createdAt" >= ${ubStart(month)} AND o."createdAt" < ${ubEnd(today)}
      GROUP BY p.id, b.name ORDER BY revenue DESC LIMIT 5`,
  ]);

  return {
    today,
    revenueToday: map.get(today)?.revenue ?? 0,
    revenueYesterday: map.get(yesterday)?.revenue ?? 0,
    paidToday: map.get(today)?.orders ?? 0,
    ordersToday,
    ordersYesterday,
    pending: { count: pendingAgg._count, today: pendingToday, amount: pendingAgg._sum.total ?? 0 },
    lowStock: {
      count: products.filter((p) => low(p.stock, p.lowStockThreshold)).length,
      out: products.filter((p) => p.stock === 0).length,
      yesterday: products.filter((p) => low(before.get(p.id) ?? p.stock, p.lowStockThreshold)).length,
    },
    toProcess,
    series,
    previousTotal,
    stageCounts,
    topCategories: cats.filter((c) => c.name !== "Хүргэлтийн төлбөр").slice(0, 6).map((c) => ({ name: c.name, revenue: c.value })),
    topProducts: top.map((t) => ({ ...t, qty: Number(t.qty), revenue: Number(t.revenue) })),
  };
}

function buckets(period: ReportDto["period"], today: string): Omit<ReportRowDto, "orders" | "revenue">[] {
  if (period === "day")
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i - 13);
      return { label: d.replace(/-/g, "."), short: short(d), from: d, to: d };
    });
  if (period === "week") {
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const monday = addDays(today, -dow);
    return Array.from({ length: 12 }, (_, i) => {
      const from = addDays(monday, (i - 11) * 7);
      const to = i === 11 ? today : addDays(from, 6);
      return { label: `${short(from)}–${short(to)}`, short: short(from), from, to };
    });
  }
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    const from = d.toISOString().slice(0, 10);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    return { label: `${d.getUTCFullYear()} · ${MONTHS[d.getUTCMonth()]}`, short: MONTHS[d.getUTCMonth()]!, from, to: last < today ? last : today };
  });
}

export async function report(period: ReportDto["period"], today = ubDay()): Promise<ReportDto> {
  const b = buckets(period, today);
  const from = b[0]!.from;
  const map = await daily(from, today);
  const rows = b.map((x) => {
    let revenue = 0;
    let orders = 0;
    for (let d = x.from; d <= x.to; d = addDays(d, 1)) {
      revenue += map.get(d)?.revenue ?? 0;
      orders += map.get(d)?.orders ?? 0;
    }
    return { ...x, revenue, orders };
  });
  const [byCategory, byBrand] = await Promise.all([split("category", from, today), split("brand", from, today)]);
  return {
    period,
    rows,
    total: rows.reduce((a, r) => a + r.revenue, 0),
    orders: rows.reduce((a, r) => a + r.orders, 0),
    byCategory,
    byBrand,
  };
}
