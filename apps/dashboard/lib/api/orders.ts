"use client";

import { getDb, setDb } from "../db";
import { nowTs } from "../format";
import { newId } from "../ids";
import type { Db, Order, OrderStatus, StockMove } from "../types";
import { staffName } from "./staff";

/*
 * Orders data access — MOCK. Later: PATCH /orders/:id/status,
 * POST /orders/:id/cancel, POST /orders/:id/notes, GET /payments/qpay/:invoiceId.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PAID_STATES: OrderStatus[] = ["paid", "preparing", "shipping", "delivered"];

/** Money in → stock out; refund-cancel → stock back. Keeps Нөөц in step with orders. */
function stockMoves(db: Db, before: Order, after: Order, at: string, by: string): Partial<Db> {
  const out = !before.paid && after.paid;
  const back = before.paid && after.status === "cancelled" && before.status !== "cancelled";
  if (!out && !back) return {};
  const sign = out ? -1 : 1;
  const products = db.products.map((p) => {
    const it = after.items.find((x) => x.productId === p.id);
    return it ? { ...p, stock: Math.max(0, p.stock + sign * it.qty) } : p;
  });
  const moves: StockMove[] = after.items.map((it) => ({
    id: newId("s"),
    at,
    productId: it.productId,
    delta: sign * it.qty,
    reason: `${out ? "Борлуулалт" : "Буцаалт"} · #${after.id}`,
    by: out ? "Систем" : by,
    after: products.find((p) => p.id === it.productId)?.stock ?? 0,
  }));
  return { products, stockLog: [...moves.reverse(), ...db.stockLog] };
}

function transition(o: Order, status: OrderStatus, at: string): Order {
  return {
    ...o,
    status,
    paid: o.paid || PAID_STATES.includes(status),
    times: { ...o.times, [status]: at },
  };
}

export async function setOrderStatus(ids: string | string[], status: OrderStatus) {
  const list = Array.isArray(ids) ? ids : [ids];
  const at = nowTs();
  const by = staffName();
  setDb((db) => {
    let next: Partial<Db> = {};
    const orders = db.orders.map((o) => {
      if (!list.includes(o.id) || o.status === status) return o;
      const after = transition(o, status, at);
      next = { ...next, ...stockMoves({ ...db, ...next }, o, after, at, by) };
      return after;
    });
    return { ...next, orders };
  });
}

export async function cancelOrder(id: string, reason: string, comment: string) {
  const at = nowTs();
  const by = staffName();
  setDb((db) => {
    let next: Partial<Db> = {};
    const orders = db.orders.map((o) => {
      if (o.id !== id) return o;
      const after: Order = {
        ...transition(o, "cancelled", at),
        notes: [...o.notes, { text: `Цуцалсан: ${reason}. ${comment}`.trim(), by, at }],
      };
      next = stockMoves(db, o, after, at, by);
      return after;
    });
    return { ...next, orders };
  });
}

export async function addOrderNote(id: string, text: string) {
  const note = { text, by: staffName(), at: nowTs() };
  setDb((db) => ({
    orders: db.orders.map((o) => (o.id === id ? { ...o, notes: [...o.notes, note] } : o)),
  }));
}

/** Ask QPay for the invoice status. The mock just answers from local data. */
export async function checkPayment(id: string): Promise<{ paid: boolean }> {
  await sleep(900);
  const o = getDb().orders.find((x) => x.id === id);
  return { paid: !!o && o.status !== "pending" && o.status !== "expired" && o.paid };
}
