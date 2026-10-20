"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { CreateOrderInput, OrderDto } from "@repo/types";
import type { Car, CheckoutForm, DeliveryMethod, Order } from "../types";
import { ApiError, api } from "./client";
import { toOrder } from "./map";

/*
 * Сессийн зочин/хэрэглэгчийн apps/service дахь захиалгууд. Жижиг кэш харагдацуудыг уялдуулна:
 * төлбөрийн цонх захиалгыг шинэчлэхэд төлбөр, амжилттай, «Миний захиалгууд» хуудас дахин зурагдана.
 */

interface State {
  list: Order[] | null;
  byNo: Record<string, Order | null>;
}
let state: State = { list: null, byNo: {} };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = { list: null, byNo: {} };

/** Захиалгын шинэ хуулбарыг кэшид хийнэ. */
export function storeOrder(dto: OrderDto): Order {
  const o = toOrder(dto);
  state = {
    byNo: { ...state.byNo, [o.no]: o },
    list: state.list ? (state.list.some((x) => x.no === o.no) ? state.list.map((x) => (x.no === o.no ? o : x)) : [o, ...state.list]) : null,
  };
  emit();
  return o;
}

export async function refreshOrders() {
  const list = (await api<OrderDto[]>("/orders")).map(toOrder);
  state = { list, byNo: { ...state.byNo, ...Object.fromEntries(list.map((o) => [o.no, o])) } };
  emit();
}

export async function refreshOrder(no: string): Promise<Order | null> {
  try {
    return storeOrder(await api<OrderDto>(`/orders/${encodeURIComponent(no)}`));
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    state = { ...state, byNo: { ...state.byNo, [no]: null } };
    emit();
    return null;
  }
}

/** «Миний захиалгууд» — ачаалж байхад `null`. */
export function useOrders() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    void refreshOrders().catch(() => {
      state = { ...state, list: state.list ?? [] };
      emit();
    });
  }, []);
  return s.list;
}

/** Нэг захиалга: ачаалж байхад `undefined`, байхгүй / бусдынх бол `null`. */
export function useOrder(no: string | null | undefined) {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    if (no) void refreshOrder(no).catch(() => undefined);
  }, [no]);
  if (!no) return null;
  return no in s.byNo ? s.byNo[no] : undefined;
}

const DELIVERY = { ship: "UB", pickup: "PICKUP" } as const;

/** Checkout: сервер сессийн сагсыг (сагсны хуудсан дээрх мөрүүдийг) үнэлж PENDING захиалга үүсгээд сагсыг хоосолно. */
export async function createOrder(input: {
  form: CheckoutForm;
  delivery: DeliveryMethod;
  car?: Car | null;
}): Promise<Order> {
  const { form, delivery, car } = input;
  const body: CreateOrderInput = {
    customer: { name: form.name.trim(), phone: form.phone, email: form.email || undefined },
    delivery:
      delivery === "pickup"
        ? { method: "PICKUP" }
        : { method: DELIVERY[delivery], district: form.district, khoroo: form.khoroo, address: form.addr.trim() },
    note: form.note || undefined,
    car: car ? `${car.make} ${car.model}${car.year ? ` ${car.year}` : ""}${car.engine ? ` · ${car.engine}` : ""}` : undefined,
  };
  return storeOrder(await api<OrderDto>("/orders", { method: "POST", body }));
}
