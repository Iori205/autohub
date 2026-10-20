import type {
  Car,
  FitStatus,
  Product,
  ProductFilter,
  SortKey,
} from "./types";

/** Цэвэр каталогийн туслахууд — сервер (API) ба клиент хоёуланд ашиглаж болно. */

export function fitStatus(p: Product, car: Car | null): FitStatus | null {
  if (!car) return null;
  if (p.fits.includes(car.model)) return "yes";
  if (p.fitUnknown || p.fits.length === 0) return "unknown";
  return "no";
}

const normOem = (s: string) => s.toLowerCase().replace(/[\s.\-/]/g, "");

export function matchesFilter(
  p: Product,
  f: ProductFilter,
  skip?: "categories" | "brands",
): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [p.name, p.oem, p.brand, ...p.crossRefs, ...p.fits];
    // OEM дугаарыг API-ийн хайлт шиг зай/зураас/цэгийг үл тоон тааруулна
    const oq = normOem(f.q);
    const oemHit = oq.length >= 3 && [p.oem, ...p.crossRefs].some((o) => normOem(o).includes(oq));
    if (!oemHit && !hay.some((t) => t.toLowerCase().includes(q))) return false;
  }
  if (skip !== "categories" && f.categories?.length && !f.categories.includes(p.category))
    return false;
  if (skip !== "brands" && f.brands?.length && !f.brands.includes(p.brand))
    return false;
  if (f.priceMin && p.price < f.priceMin) return false;
  if (f.priceMax && p.price > f.priceMax) return false;
  if (f.type === "orig" && !p.genuine) return false;
  if (f.type === "analog" && p.genuine) return false;
  if (f.inStock && p.stock <= 0) return false;
  if (f.fitModel && !p.fits.includes(f.fitModel)) return false;
  if (f.sale && !p.oldPrice) return false;
  return true;
}

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  if (sort === "asc") return [...list].sort((a, b) => a.price - b.price);
  if (sort === "desc") return [...list].sort((a, b) => b.price - a.price);
  if (sort === "stock") return [...list].sort((a, b) => b.stock - a.stock);
  return list;
}

export const parsePrice = (s: string) => Number(s.replace(/\D/g, "")) || 0;

export const FREE_SHIPPING_FROM = 200000;
export const SHIPPING_FEE = 5000;

export const shippingFor = (subtotal: number, delivery: "ship" | "pickup") =>
  delivery === "pickup" ? 0 : subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

export const carLabel = (car: Car | null) =>
  car ? `${car.make} ${car.model}${car.year ? " " + car.year : ""}` : "";

export const stockText = (p: Product) =>
  p.stock > 0 ? `Үлдэгдэл: ${p.stock} ш` : "Дууссан · захиалгаар";

export const stockColor = (p: Product) =>
  p.stock === 0 ? "var(--mut)" : p.stock <= 3 ? "var(--warn)" : "var(--ok)";
