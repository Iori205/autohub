"use client";

import type { ProductDetailDto, ProductInput as ProductBody } from "@repo/types";
import { getDb, reload } from "../db";
import type { Fitment, Product } from "../types";
import { api } from "./client";

/* Бараа ба нөөц → /admin/products, /admin/products/bulk, /admin/stock/adjust. */

export type ProductInput = Omit<Product, "id">;

const parseYears = (y: string): [number, number] => {
  const [a, b] = y.split(/[–-]/).map((s) => Number(s.trim()));
  return [a!, b || a!];
};

/** Тохирлын мөр → машины id (сонгогчийн мөрд make/model/year/engine байдаг; ачаалсан мөрд id аль хэдийн бий). */
function toFitments(fits: Fitment[]) {
  const vehicles = getDb()?.vehicles ?? [];
  const out = new Map<string, { vehicleId: string; yearFrom: number; yearTo: number }>();
  for (const f of fits) {
    const [from, to] = f.yearFrom && f.yearTo ? [f.yearFrom, f.yearTo] : parseYears(f.years);
    const ids = f.vehicleId
      ? [f.vehicleId]
      : vehicles
          .filter((v) => v.make === f.make && v.model === f.model && (!f.engine || v.engine === f.engine) && v.yearFrom <= to && v.yearTo >= from)
          .map((v) => v.id);
    for (const vehicleId of ids) {
      const prev = out.get(vehicleId);
      out.set(vehicleId, prev ? { vehicleId, yearFrom: Math.min(prev.yearFrom, from), yearTo: Math.max(prev.yearTo, to) } : { vehicleId, yearFrom: from, yearTo: to });
    }
  }
  return [...out.values()];
}

function toBody(p: ProductInput): ProductBody {
  const db = getDb();
  const brandId = db?.brands.find((b) => b.name === p.brand)?.id;
  const categoryId = db?.categories.find((c) => c.key === p.category)?.id;
  return {
    name: p.name,
    description: p.description,
    brandId: brandId ?? "",
    categoryId: categoryId ?? "",
    oemNumbers: p.oem,
    price: p.price,
    oldPrice: p.oldPrice,
    stock: p.stock,
    lowStockThreshold: p.threshold,
    type: p.genuine ? "ORIGINAL" : "AFTERMARKET",
    images: p.images,
    specs: p.specs,
    fitmentUnknown: false,
    active: p.active,
    fitments: toFitments(p.fits),
  };
}

export async function saveProduct(input: ProductInput, id?: number): Promise<number> {
  const body = toBody(input);
  const saved = id
    ? await api<ProductDetailDto>(`/admin/products/${id}`, { method: "PATCH", body })
    : await api<ProductDetailDto>("/admin/products", { method: "POST", body });
  await reload("products", "stockLog", "vehicles");
  return saved.id;
}

const bulk = (body: object) => api("/admin/products/bulk", { method: "POST", body });

export async function deleteProducts(ids: number[]) {
  await bulk({ action: "delete", ids });
  await reload("products", "vehicles");
}

export async function setProductsActive(ids: number[], active: boolean) {
  await bulk({ action: active ? "activate" : "hide", ids });
  await reload("products");
}

export type PriceMode = "up" | "down" | "fixed";

export async function bulkPrice(ids: number[], mode: PriceMode, value: number) {
  await bulk({ action: "price", ids, mode, value });
  await reload("products");
}

export async function bulkStock(ids: number[], mode: "add" | "set", value: number) {
  await bulk({ action: "stock", ids, mode, value });
  await reload("products", "stockLog");
}

export async function setThreshold(id: number, threshold: number) {
  await api(`/admin/products/${id}`, { method: "PATCH", body: { lowStockThreshold: threshold } });
  await reload("products");
}

/** «Нөөц тохируулах» — шинэ үлдэгдлийг буцаана. */
export async function adjustStock(productId: number, delta: number, reason: string) {
  const r = await api<{ stock: number }>("/admin/stock/adjust", { method: "POST", body: { productId, delta, reason } });
  await reload("products", "stockLog");
  return r.stock;
}
