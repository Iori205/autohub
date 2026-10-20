import type { BannerDto, CategoryDto, Page, ProductDetailDto, ProductSummaryDto, PublicSettingsDto, VehicleDto } from "@repo/types";
import type { Category, CategoryKey, Product, VehicleModel } from "../types";
import { ApiError, api } from "./client";
import { toCategory, toProduct, toVehicleModels } from "./map";

/*
 * Каталогийн өгөгдөл (server component). Бүгд apps/service-ээс ирж, кэшлэгддэггүй тул
 * самбар дахь үнэ/нөөцийн өөрчлөлт шууд харагдана.
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

/** Бүх идэвхтэй бараа «Санал болгох» дарааллаар (дэлгүүр хөтөч дээр шүүнэ). */
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

/** «Онцлох бараа»: санал болгох дарааллын эхний найм. */
export async function getFeaturedProducts(): Promise<Product[]> {
  const page = await api<Page<ProductSummaryDto>>("/catalog/products?pageSize=8");
  return page.items.map(toProduct);
}

/** «Хамт авдаг бараа» — ижил машинд тохирох сэлбэг эхэнд, дараа нь бусад. */
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
