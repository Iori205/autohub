"use client";

import { useSyncExternalStore } from "react";
import { shippingFor } from "../catalog";
import type {
  CartLine,
  CheckoutForm,
  DeliveryMethod,
  Invoice,
  Order,
} from "../types";

/*
 * Orders data access — MOCK BACKEND.
 * Orders live in localStorage so the full checkout → QPay → "Миний захиалгууд"
 * flow works without a server. Replace the bodies of the exported async
 * functions with fetch() calls to apps/service; components only use these
 * functions and the useOrders/useOrder hooks.
 */

const KEY = "autohub:orders:v1";
export const INVOICE_TTL = 15 * 60e3;
export const PICKUP_ADDRESS = "Хан-Уул салбар, Чингисийн өргөн чөлөө 24";

const seed = (): Order[] => [
  {
    no: "A1009",
    items: [
      { productId: 3, name: "Тосны шүүлтүүр (элемент)", price: 18500, qty: 2 },
      { productId: 7, name: "Моторын тос 0W-20 SP, 4 л", price: 128000, qty: 1 },
    ],
    subtotal: 165000,
    shipping: 5000,
    total: 170000,
    name: "Бат-Эрдэнэ",
    phone: "99112233",
    delivery: "ship",
    address: "Хан-Уул, 15-р хороо, Зайсан, 45-р байр 12 тоот",
    created: new Date("2026-09-18T11:20:00").getTime(),
    payStatus: "paid",
    stage: 4,
    paidAt: new Date("2026-09-18T11:23:00").getTime(),
    txn: "418273650912",
    invoice: { id: "INV-A1009-552210", created: 0, expires: 0 },
  },
];

let cache: Order[] | null = null;
const listeners = new Set<() => void>();

function load(): Order[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Order[]) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

function save(next: Order[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** `null` until the client store is read (SSR / first paint). */
export const useOrders = () =>
  useSyncExternalStore(subscribe, load, () => null);

export function useOrder(no: string | null | undefined) {
  const orders = useOrders();
  if (!orders) return undefined; // loading
  return orders.find((o) => o.no === no) ?? null;
}

export const newInvoice = (no: string): Invoice => {
  const t = Date.now();
  return { id: `INV-${no}-${String(t).slice(-6)}`, created: t, expires: t + INVOICE_TTL };
};

export async function patchOrder(no: string, patch: Partial<Order>): Promise<Order | null> {
  const next = load().map((o) => (o.no === no ? { ...o, ...patch } : o));
  save(next);
  return next.find((o) => o.no === no) ?? null;
}

export async function getOrder(no: string): Promise<Order | null> {
  return load().find((o) => o.no === no) ?? null;
}

export async function listMyOrders(): Promise<Order[]> {
  return [...load()].sort((a, b) => b.created - a.created);
}

export async function createOrder(input: {
  lines: CartLine[];
  form: CheckoutForm;
  delivery: DeliveryMethod;
}): Promise<Order> {
  const { lines, form, delivery } = input;
  const orders = load();
  const maxNo = Math.max(1023, ...orders.map((o) => Number(o.no.slice(1)) || 0));
  const no = "A" + (maxNo + 1);
  const subtotal = lines.reduce((a, l) => a + l.product.price * l.qty, 0);
  const shipping = shippingFor(subtotal, delivery);
  const order: Order = {
    no,
    items: lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      price: l.product.price,
      qty: l.qty,
    })),
    subtotal,
    shipping,
    total: subtotal + shipping,
    name: form.name.trim(),
    phone: form.phone.replace(/\s/g, ""),
    email: form.email || undefined,
    note: form.note || undefined,
    delivery,
    address:
      delivery === "ship"
        ? `${form.district}, ${form.khoroo}, ${form.addr.trim()}`
        : PICKUP_ADDRESS,
    created: Date.now(),
    payStatus: "pending",
    stage: 0,
    invoice: newInvoice(no),
  };
  save([order, ...orders]);
  return order;
}
