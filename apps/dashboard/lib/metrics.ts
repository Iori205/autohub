import { stockLevel, isLive } from "./status";
import type { Customer, Order, Product } from "./types";

/*
 * Ачаалсан админ өгөгдлөөс гаргасан тоо. Самбар, тайлангийн нийлбэр сервисээс (/admin/stats/*) ирнэ;
 * эдгээр нь жагсаалт, тэмдэгт зориулагдсан. «Орлого» = төлөгдсөн, буцаагдаагүй захиалга (бараа + хүргэлт).
 */

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

/** Төлөгдөөд бэлтгэл эхлэхийг хүлээж буй захиалгууд. */
export const toProcess = (orders: Order[]) => orders.filter((o) => o.status === "paid");

export type Period = "day" | "week" | "month";
