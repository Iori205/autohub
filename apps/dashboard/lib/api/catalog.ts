"use client";

import { reload } from "../db";
import type { Brand, Category, Vehicle } from "../types";
import { api } from "./client";
import { FUEL_CODE } from "./map";

/* Ангилал, брэнд, машины сан → /admin/categories, /admin/brands, /admin/vehicles. */

export async function saveCategory(input: Omit<Category, "id">, id?: string) {
  const body = { name: input.name, slug: input.key, icon: input.icon };
  await api(id ? `/admin/categories/${id}` : "/admin/categories", { method: id ? "PATCH" : "POST", body });
  await reload("categories", "products");
}

/** Зөвхөн хоосон ангиллыг устгаж болно (үгүй бол 409). */
export async function deleteCategory(id: string) {
  await api(`/admin/categories/${id}`, { method: "DELETE" });
  await reload("categories");
}

export async function saveBrand(input: Omit<Brand, "id">, id?: string) {
  const body = { name: input.name, country: input.country, kind: input.kind === "oem" ? "ORIGINAL" : "AFTERMARKET" };
  await api(id ? `/admin/brands/${id}` : "/admin/brands", { method: id ? "PATCH" : "POST", body });
  await reload("brands", "products");
}

/** Бараатай брэндийг устгах боломжгүй (барааны тоотой 409). */
export async function deleteBrand(id: string) {
  await api(`/admin/brands/${id}`, { method: "DELETE" });
  await reload("brands");
}

export async function saveVehicle(input: Omit<Vehicle, "id" | "productCount">, id?: string) {
  const body = {
    make: input.make,
    model: input.model,
    generation: input.gen,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
    engine: input.engine,
    fuel: FUEL_CODE[input.fuel],
  };
  await api(id ? `/admin/vehicles/${id}` : "/admin/vehicles", { method: id ? "PATCH" : "POST", body });
  await reload("vehicles", "products");
}

/** Машинтай холбоотой барааны тохирлуудыг мөн устгана. */
export async function deleteVehicle(id: string) {
  await api(`/admin/vehicles/${id}`, { method: "DELETE" });
  await reload("vehicles", "products");
}

/** CSV: make,model,gen,year_from,year_to,engine,fuel — сервис задлана; байгаа мөрүүдийг алгасна. */
export async function importVehicles(csv: string): Promise<{ added: number; skipped: number; errors: number }> {
  const r = await api<{ added: number; skipped: number; errors: unknown[] }>("/admin/vehicles/import", { method: "POST", body: { csv } });
  await reload("vehicles");
  return { added: r.added, skipped: r.skipped, errors: r.errors.length };
}
