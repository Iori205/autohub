"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  AdminOrderDto,
  BannerDto,
  BrandDto,
  CampaignDto,
  CategoryDto,
  CustomerDto,
  DeliverySettings,
  Page,
  ProductDetailDto,
  QPaySettingsDto,
  StaffDto,
  StockMovementDto,
  StoreSettings,
  VehicleDto,
} from "@repo/types";
import { ApiError, api } from "./api/client";
import {
  toAdmin,
  toBanner,
  toBrand,
  toCampaign,
  toCategory,
  toCustomer,
  toOrder,
  toProduct,
  toSettings,
  toStockMove,
  toVehicle,
} from "./api/map";
import type { Db } from "./types";
import { toast } from "./ui";

/*
 * apps/service-ийн админ өгөгдлийн клиент кэш: хуудсууд useDb()-ээр уншиж, lib/api/* API-аар бичээд хөндсөн нөөцөө дахин ачаална.
 * Хуудас нээгдэх (хэдэн секундээс хуучин бол) болон таб идэвхжих үед шинэчлэгддэг тул дэлгүүрийн шинэ захиалга шууд харагдана.
 */

type Key = keyof Db;

/** Хуудасласан админ жагсаалтын бүх хуудас (хүсэлт бүрт 500). */
async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const r = await api<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}pageSize=500&page=${page}`);
    out.push(...r.items);
    if (out.length >= r.total || !r.items.length) return out;
  }
}

const LOAD: { [K in Key]: () => Promise<Db[K]> } = {
  products: async () => (await all<ProductDetailDto>("/admin/products")).map(toProduct),
  categories: async () => (await api<CategoryDto[]>("/admin/categories")).map(toCategory),
  brands: async () => (await api<BrandDto[]>("/admin/brands")).map(toBrand),
  vehicles: async () => (await api<(VehicleDto & { productCount: number })[]>("/admin/vehicles")).map(toVehicle),
  customers: async () => (await all<CustomerDto>("/admin/customers")).map(toCustomer),
  orders: async () => (await all<AdminOrderDto>("/admin/orders")).map(toOrder),
  stockLog: async () => (await api<Page<StockMovementDto>>("/admin/stock?pageSize=200")).items.map(toStockMove),
  banners: async () => (await api<BannerDto[]>("/admin/banners")).map(toBanner),
  campaigns: async () => (await api<CampaignDto[]>("/admin/campaigns")).map(toCampaign),
  settings: async () =>
    toSettings(await api<{ store: StoreSettings; delivery: DeliverySettings; qpay: QPaySettingsDto }>("/admin/settings")),
  admins: async () => (await api<StaffDto[]>("/admin/staff")).map(toAdmin),
};
const ALL = Object.keys(LOAD) as Key[];
const STALE_MS = 5_000;

let cache: Db | null = null;
let loadedAt = 0;
let full: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Зочин хэрэглэгчид бүртгэлийн нэр байхгүй тул захиалгадаа бичсэн нэрийг харуулна. */
function fillGuestNames(db: Db): Db {
  const missing = db.customers.filter((c) => !c.name || !c.phone);
  if (!missing.length) return db;
  const latest = new Map<string, Db["orders"][number]>();
  for (const o of db.orders) if (!latest.has(o.customerId)) latest.set(o.customerId, o); // захиалга хамгийн шинэ нь эхэндээ
  return {
    ...db,
    customers: db.customers.map((c) => {
      const o = latest.get(c.id);
      return o && (!c.name || !c.phone) ? { ...c, name: c.name || o.customer.name, phone: c.phone || o.customer.phone } : c;
    }),
  };
}

/** Зарим (анхдагчаар бүх) нөөцийг татаж кэшийг шинэчилнэ. */
export async function reload(...keys: Key[]): Promise<void> {
  const list = keys.length ? keys : ALL;
  const parts = await Promise.all(list.map(async (k) => [k, await LOAD[k]()] as const));
  const next = { ...(cache ?? ({} as Db)), ...Object.fromEntries(parts) } as Db;
  if (list.length === ALL.length || cache) {
    cache = fillGuestNames(next);
    if (list.length === ALL.length) loadedAt = Date.now();
    emit();
  }
}

function refresh(force = false) {
  if (full || (!force && cache && Date.now() - loadedAt < STALE_MS)) return;
  full = reload()
    .catch((e) => {
      // 401-ийг сесс хариуцна (/login руу); бусад алдааг мэдэгдэнэ
      if (!(e instanceof ApiError && e.status === 401)) toast(e instanceof Error ? e.message : "Өгөгдөл ачаалж чадсангүй", "err");
    })
    .finally(() => (full = null));
}

/** Бүгдийг мартана (гарах, эсвэл өөр ажилтан нэвтрэх). */
export function clearDb() {
  cache = null;
  loadedAt = 0;
  emit();
}

let watching = false;
function watchFocus() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const onFocus = () => document.visibilityState === "visible" && cache && refresh();
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Анхны ачаалал хүртэл `null` — өгөгдөл иртэл хуудсууд skeleton харуулна. */
export function useDb() {
  const db = useSyncExternalStore(subscribe, () => cache, () => null);
  useEffect(() => {
    watchFocus();
    refresh();
  }, []);
  return db;
}

export const getDb = () => cache;
