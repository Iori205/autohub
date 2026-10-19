import type { BannerDto, CategoryDto, Page, ProductDetailDto, ProductSummaryDto, PublicSettingsDto, VehicleDto } from "@repo/types";
import type { Category, CategoryKey, Product, VehicleModel } from "../types";
import { ApiError, api } from "./client";
import { toCategory, toProduct, toVehicleModels } from "./map";

/*
 * Catalog data access (server components). Everything comes from apps/service;
 * nothing is cached, so price/stock edits in the dashboard show immediately.
 */

export async function getCategories(): Promise<Category[]> {
  return (await api<CategoryDto[]>("/catalog/categories")).map(toCategory);
}

export async function getCategory(key: string): Promise<Category | null> {
  return (await getCategories()).find((c) => c.key === key) ?? null;
}

export async function getBrands(): Promise<string[]> {
  return (await api<{ name: string }[]>("/catalog/brands")).map((b) => b.name);
}

export async function getVehicles(): Promise<VehicleModel[]> {
  return toVehicleModels(await api<VehicleDto[]>("/vehicles"));
}

/** All active products in "Санал болгох" order (the shop filters them in the browser). */
export async function getProducts(): Promise<Product[]> {
  const page = await api<Page<ProductSummaryDto>>("/catalog/products?pageSize=100");
  return page.items.map(toProduct);
}

export async function getProduct(id: number): Promise<Product | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return toProduct(await api<ProductDetailDto>(`/catalog/products/${id}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** "Онцлох бараа": the first eight in recommended order. */
export async function getFeaturedProducts(): Promise<Product[]> {
  const page = await api<Page<ProductSummaryDto>>("/catalog/products?pageSize=8");
  return page.items.map(toProduct);
}

/** "Хамт авдаг бараа" — parts sharing a vehicle first, then anything else. */
export async function getRelatedProducts(id: number, limit = 4): Promise<Product[]> {
  const all = await getProducts();
  const base = all.find((p) => p.id === id);
  if (!base) return [];
  const others = all.filter((p) => p.id !== id);
  const sameCar = others.filter((p) => p.fits.some((m) => base.fits.includes(m)));
  return [...new Set([...sameCar, ...others])].slice(0, limit);
}

export const getBanners = () => api<BannerDto[]>("/banners");

export const getSiteSettings = () => api<PublicSettingsDto>("/settings");

export const categoryName = (cats: Category[], key: CategoryKey) =>
  cats.find((c) => c.key === key)?.name ?? "";
