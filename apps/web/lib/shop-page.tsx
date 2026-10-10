import { ShopView } from "../components/shop/ShopView";
import { getBrands, getCategories, getProducts } from "./api/catalog";
import type { CategoryKey } from "./types";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Shared server loader for /shop, /shop/[category] and /sale. */
export async function renderShop(sp: SP, opts: { cat?: CategoryKey; sale?: boolean } = {}) {
  const [products, categories, brands] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
  ]);
  const brand = one(sp.brand);
  const initial = {
    cats: opts.cat ? [opts.cat] : [],
    brands: brand && brands.includes(brand) ? [brand] : [],
    q: one(sp.q),
    sale: !!opts.sale,
    fit: one(sp.fit) === "1",
  };
  // Re-mount (reset filters) whenever the URL-driven starting point changes.
  const key = JSON.stringify(initial);
  return (
    <ShopView
      key={key}
      products={products}
      categories={categories}
      brands={brands}
      initial={initial}
    />
  );
}
