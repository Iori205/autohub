"use client";

import { setDb } from "../db";
import { newId } from "../ids";
import type { Brand, Category, Vehicle } from "../types";

/*
 * Categories, brands and the vehicle database — MOCK.
 * Later: /categories, /brands, /vehicles (+ POST /vehicles/import for CSV).
 */

export async function saveCategory(input: Category, originalKey?: string) {
  setDb((db) => {
    if (!originalKey) return { categories: [...db.categories, input] };
    return {
      categories: db.categories.map((c) => (c.key === originalKey ? input : c)),
      // products reference the category by key
      products:
        originalKey === input.key
          ? db.products
          : db.products.map((p) => (p.category === originalKey ? { ...p, category: input.key } : p)),
    };
  });
}

export async function deleteCategory(key: string) {
  setDb((db) => ({ categories: db.categories.filter((c) => c.key !== key) }));
}

export async function saveBrand(input: Omit<Brand, "id">, id?: string) {
  setDb((db) => {
    if (!id) return { brands: [...db.brands, { ...input, id: newId("b") }] };
    const before = db.brands.find((b) => b.id === id);
    return {
      brands: db.brands.map((b) => (b.id === id ? { ...input, id } : b)),
      products:
        before && before.name !== input.name
          ? db.products.map((p) => (p.brand === before.name ? { ...p, brand: input.name } : p))
          : db.products,
    };
  });
}

export async function deleteBrand(id: string) {
  setDb((db) => ({ brands: db.brands.filter((b) => b.id !== id) }));
}

export async function saveVehicle(input: Omit<Vehicle, "id">, id?: string) {
  setDb((db) =>
    id
      ? { vehicles: db.vehicles.map((v) => (v.id === id ? { ...input, id } : v)) }
      : { vehicles: [...db.vehicles, { ...input, id: newId("v") }] },
  );
}

export async function deleteVehicle(id: string) {
  setDb((db) => ({ vehicles: db.vehicles.filter((v) => v.id !== id) }));
}

const FUELS = ["Бензин", "Дизель", "Хайбрид", "Цахилгаан"] as const;

/**
 * Parse a vehicles CSV (make,model,gen,year_from,year_to,engine,fuel).
 * The service will do this server-side; the mock parses in the browser.
 */
export async function importVehicles(csv: string): Promise<{ added: number; errors: number }> {
  const rows = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows[0]?.toLowerCase().startsWith("make")) rows.shift();
  const parsed: Omit<Vehicle, "id">[] = [];
  let errors = 0;
  for (const row of rows) {
    const [make, model, gen, y1, y2, engine, fuel] = row.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const yearFrom = Number(y1);
    const yearTo = Number(y2);
    const f = FUELS.find((x) => x === fuel) ?? "Бензин";
    if (!make || !model || !engine || !(yearFrom >= 1980) || !(yearTo >= yearFrom)) {
      errors++;
      continue;
    }
    parsed.push({ make, model, gen: gen ?? "", yearFrom, yearTo, engine, fuel: f });
  }
  setDb((db) => {
    const fresh = parsed.filter(
      (n) => !db.vehicles.some((v) => v.make === n.make && v.model === n.model && v.engine === n.engine),
    );
    return { vehicles: [...db.vehicles, ...fresh.map((v) => ({ ...v, id: newId("v") }))] };
  });
  return { added: parsed.length, errors };
}
