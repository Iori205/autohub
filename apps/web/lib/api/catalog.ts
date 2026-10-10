import type { Category, CategoryKey, Product, VehicleModel } from "../types";
import {
  BRANDS,
  CATEGORIES,
  PRODUCTS,
  VEHICLES,
} from "../data/mock-catalog";

/*
 * Catalog data access. Every function is async so pages are already written
 * against an API shape — swap the bodies for `fetch()` calls to apps/service.
 */

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategory(key: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.key === key) ?? null;
}

export async function getBrands(): Promise<string[]> {
  return BRANDS;
}

export async function getVehicles(): Promise<VehicleModel[]> {
  return VEHICLES;
}

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}

export async function getProduct(id: number): Promise<Product | null> {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return [1, 7, 3, 6, 10, 5, 2, 9]
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
}

/** "Хамт авдаг бараа" — parts sharing a vehicle first, then anything else. */
export async function getRelatedProducts(id: number, limit = 4): Promise<Product[]> {
  const base = PRODUCTS.find((p) => p.id === id);
  if (!base) return [];
  const others = PRODUCTS.filter((p) => p.id !== id);
  const sameCar = others.filter((p) => p.fits.some((m) => base.fits.includes(m)));
  return [...new Set([...sameCar, ...others])].slice(0, limit);
}

export const categoryName = (cats: Category[], key: CategoryKey) =>
  cats.find((c) => c.key === key)?.name ?? "";
