"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { CustomerSessionDto } from "@repo/types";
import { syncShop } from "../store/shop";
import { api } from "./client";
import { refreshOrders } from "./orders";

/*
 * Хэрэглэгчийн сесс (apps/service-ийн httpOnly күүки). Зочныг нэвтрээгүй гэж үзнэ; бүртгүүлэхэд зочин тэр чигтээ бүртгэл болж,
 * нэвтрэхэд зочны сагс/хүслийн жагсаалт/захиалга бүртгэл рүү шилждэг тул аль алиных нь дараа сагс, захиалгыг дахин ачаална.
 */

/** Ачаалж байхад `undefined`, нэвтрээгүй (эсвэл зөвхөн зочин) үед `null`. */
type Me = CustomerSessionDto | null | undefined;

let me: Me = undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (v: Me) => {
  me = v && !v.isGuest ? v : null;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function loadMe(force = false) {
  if (!loading || force)
    loading = api<CustomerSessionDto | null>("/auth/me")
      .then(set)
      .catch(() => set(null));
  return loading;
}

export function useCustomer(): Me {
  const v = useSyncExternalStore(subscribe, () => me, () => undefined);
  useEffect(() => {
    void loadMe();
  }, []);
  return v;
}

async function afterChange(v: CustomerSessionDto | null) {
  set(v);
  loading = Promise.resolve();
  await Promise.all([syncShop(true), refreshOrders().catch(() => undefined)]);
}

export async function login(input: { login: string; password: string }) {
  const v = await api<CustomerSessionDto>("/auth/login", { method: "POST", body: input });
  await afterChange(v);
  return v;
}

export async function register(input: { name: string; phone: string; email?: string; password: string }) {
  const v = await api<CustomerSessionDto>("/auth/register", { method: "POST", body: input });
  await afterChange(v);
  return v;
}

export async function logout() {
  await api("/auth/logout", { method: "POST" });
  await afterChange(null);
}

/** Нэвтэрсний дараа зөвхөн ижил сайтын зам руу шилжинэ (open redirect-гүй). */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/account/orders";
