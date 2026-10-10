"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { carLabel, matchesFilter, parsePrice, sortProducts } from "../../lib/catalog";
import { setCar, useShop } from "../../lib/store/shop";
import { shopHref } from "../../lib/site";
import type {
  Category,
  CategoryKey,
  Product,
  ProductFilter,
  ProductType,
  SortKey,
} from "../../lib/types";
import { ProductGrid } from "../product/ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { ProductRow } from "./ProductRow";
import styles from "./ShopView.module.css";

export interface ShopInitial {
  cats: CategoryKey[];
  brands: string[];
  q: string;
  sale: boolean;
  fit: boolean;
}

export interface FilterState {
  cats: CategoryKey[];
  brands: string[];
  pMin: string;
  pMax: string;
  type: ProductType;
  inStock: boolean;
  fitOnly: boolean;
  sale: boolean;
  q: string;
}

export function ShopView({
  products,
  categories,
  brands,
  initial,
}: {
  products: Product[];
  categories: Category[];
  brands: string[];
  initial: ShopInitial;
}) {
  const { car } = useShop();
  const [f, setF] = useState<FilterState>({
    cats: initial.cats,
    brands: initial.brands,
    pMin: "",
    pMax: "",
    type: "all",
    inStock: false,
    fitOnly: initial.fit,
    sale: initial.sale,
    q: initial.q,
  });
  const [sort, setSort] = useState<SortKey>("rec");
  const [view, setView] = useState<"grid" | "rows">("grid");
  const [sheet, setSheet] = useState(false);

  const patch = (p: Partial<FilterState>) => setF((s) => ({ ...s, ...p }));
  const clear = () =>
    setF({
      cats: [],
      brands: [],
      pMin: "",
      pMax: "",
      type: "all",
      inStock: false,
      fitOnly: false,
      sale: false,
      q: "",
    });

  const filter: ProductFilter = {
    q: f.q,
    categories: f.cats,
    brands: f.brands,
    priceMin: f.pMin ? parsePrice(f.pMin) : undefined,
    priceMax: f.pMax ? parsePrice(f.pMax) : undefined,
    type: f.type,
    inStock: f.inStock,
    fitModel: f.fitOnly && car ? car.model : undefined,
    sale: f.sale,
  };
  const results = sortProducts(
    products.filter((p) => matchesFilter(p, filter)),
    sort,
  );

  const catCounts = Object.fromEntries(
    categories.map((c) => [
      c.key,
      products.filter((p) => p.category === c.key && matchesFilter(p, filter, "categories"))
        .length,
    ]),
  );
  const brandCounts = Object.fromEntries(
    brands.map((b) => [
      b,
      products.filter((p) => p.brand === b && matchesFilter(p, filter, "brands")).length,
    ]),
  );

  const title = f.sale
    ? "Хямдрал"
    : f.q
      ? `“${f.q}” хайлт`
      : f.cats.length === 1
        ? (categories.find((c) => c.key === f.cats[0])?.name ?? "")
        : f.fitOnly && car
          ? `${car.make} ${car.model} — сэлбэг`
          : "Бүх сэлбэг";
  const hasCrumb = f.cats.length === 1 || f.sale || !!f.q;

  return (
    <main className={`container ${styles.page}`}>
      <nav className="crumbs">
        <Link href="/">Нүүр</Link>
        <span>›</span>
        <Link href={shopHref()}>Дэлгүүр</Link>
        {hasCrumb && (
          <>
            <span>›</span>
            <span className="here">{title}</span>
          </>
        )}
      </nav>
      <h1 className={`page-title ${styles.title}`}>{title}</h1>

      <div className={styles.layout}>
        <FilterSidebar
          f={f}
          patch={patch}
          clear={clear}
          car={car}
          carText={carLabel(car)}
          clearCar={() => {
            setCar(null);
            patch({ fitOnly: false });
          }}
          categories={categories}
          brands={brands}
          catCounts={catCounts}
          brandCounts={brandCounts}
          resultCount={results.length}
          sheetOpen={sheet}
          closeSheet={() => setSheet(false)}
        />

        <div style={{ minWidth: 0 }}>
          <div className={styles.toolbar}>
            <button className={`only-mobile ${styles.filterBtn}`} onClick={() => setSheet(true)}>
              <SlidersHorizontal size={15} />
              Шүүлтүүр
            </button>
            <span className={styles.count}>
              <b>{results.length}</b> бараа олдлоо
            </span>
            <div className={styles.tools}>
              <span className="select-wrap">
                <select
                  className={styles.sort}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="rec">Санал болгох</option>
                  <option value="asc">Үнэ: багаас их</option>
                  <option value="desc">Үнэ: ихээс бага</option>
                  <option value="stock">Үлдэгдэл ихтэй</option>
                </select>
                <ChevronDown size={13} style={{ right: 11 }} />
              </span>
              <div className={styles.viewToggle}>
                <button
                  data-active={view === "grid"}
                  onClick={() => setView("grid")}
                  aria-label="Хүснэгтээр"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  data-active={view === "rows"}
                  onClick={() => setView("rows")}
                  aria-label="Жагсаалтаар"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {results.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Тохирох бараа олдсонгүй</div>
              <div style={{ marginBottom: 16 }}>
                Шүүлтүүрээ өөрчилж үзнэ үү эсвэл онлайн зөвлөхөөс асуугаарай.
              </div>
              <button className="btn btn-primary" style={{ height: 40 }} onClick={clear}>
                Шүүлтүүр цэвэрлэх
              </button>
            </div>
          ) : view === "grid" ? (
            <ProductGrid products={results} min={240} />
          ) : (
            <div className={styles.rows}>
              {results.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
