"use client";

import { Car, Check, X } from "lucide-react";
import Link from "next/link";
import { FINDER_HREF } from "../../lib/site";
import type { Car as CarT, Category, CategoryKey, ProductType } from "../../lib/types";
import { Switch } from "../ui/Switch";
import type { FilterState } from "./ShopView";
import styles from "./FilterSidebar.module.css";

const PRICE_CHIPS: [string, string, string][] = [
  ["50,000₮ хүртэл", "", "50000"],
  ["50–200 мянга", "50000", "200000"],
  ["200,000₮-с дээш", "200000", ""],
];

const TYPES: [ProductType, string][] = [
  ["all", "Бүгд"],
  ["orig", "Оригинал"],
  ["analog", "Аналог"],
];

function CheckRow({
  label,
  count,
  on,
  onToggle,
}: {
  label: string;
  count: number;
  on: boolean;
  onToggle: () => void;
}) {
  const disabled = count === 0 && !on;
  return (
    <button className={styles.check} onClick={onToggle} disabled={disabled} data-on={on}>
      <span className={styles.box}>
        <Check size={12} strokeWidth={3} />
      </span>
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      <span className={styles.cnt}>{disabled ? "" : count}</span>
    </button>
  );
}

export function FilterSidebar(props: {
  f: FilterState;
  patch: (p: Partial<FilterState>) => void;
  clear: () => void;
  car: CarT | null;
  carText: string;
  clearCar: () => void;
  categories: Category[];
  brands: string[];
  catCounts: Record<string, number>;
  brandCounts: Record<string, number>;
  resultCount: number;
  sheetOpen: boolean;
  closeSheet: () => void;
}) {
  const { f, patch, car } = props;
  const toggleCat = (k: CategoryKey) =>
    patch({ cats: f.cats.includes(k) ? f.cats.filter((x) => x !== k) : [...f.cats, k] });
  const toggleBrand = (b: string) =>
    patch({
      brands: f.brands.includes(b) ? f.brands.filter((x) => x !== b) : [...f.brands, b],
    });

  return (
    <div className={styles.overlay} data-open={props.sheetOpen} onClick={props.closeSheet}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={`only-mobile ${styles.sheetHead}`}>
          <span className={styles.grabber} />
          <div className={styles.sheetTitleRow}>
            <span className={styles.sheetTitle}>Шүүлтүүр</span>
            <button className={styles.sheetClose} onClick={props.closeSheet}>
              <X size={16} />
            </button>
          </div>
        </div>

        <aside className={styles.aside}>
          <div className={styles.section} style={{ gap: 12 }}>
            <div className="eyebrow">МАШИН</div>
            {car ? (
              <>
                <div className={`ok-pill ${styles.car}`}>
                  <Car size={18} style={{ color: "var(--ok)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.carName}>{props.carText}</div>
                    <div className={styles.carEngine}>{car.engine}</div>
                  </div>
                  <button onClick={props.clearCar} aria-label="Машин арилгах">
                    <X size={15} />
                  </button>
                </div>
                <button className={styles.switchRow} onClick={() => patch({ fitOnly: !f.fitOnly })}>
                  Зөвхөн тохирохыг харуулах
                  <Switch on={f.fitOnly} tone="ok" />
                </button>
              </>
            ) : (
              <Link href={FINDER_HREF} className={styles.pickCar}>
                <Car size={16} />
                Машинаа сонгох
              </Link>
            )}
          </div>

          <div className={styles.section}>
            <div className="eyebrow">АНГИЛАЛ</div>
            {props.categories.map((c) => (
              <CheckRow
                key={c.key}
                label={c.name}
                count={props.catCounts[c.key] ?? 0}
                on={f.cats.includes(c.key)}
                onToggle={() => toggleCat(c.key)}
              />
            ))}
          </div>

          <div className={styles.section}>
            <div className="eyebrow">БРЭНД</div>
            {props.brands.map((b) => (
              <CheckRow
                key={b}
                label={b}
                count={props.brandCounts[b] ?? 0}
                on={f.brands.includes(b)}
                onToggle={() => toggleBrand(b)}
              />
            ))}
          </div>

          <div className={styles.section}>
            <div className="eyebrow">ҮНЭ (₮)</div>
            <div className={styles.priceInputs}>
              <input
                value={f.pMin}
                onChange={(e) => patch({ pMin: e.target.value })}
                inputMode="numeric"
                placeholder="0"
              />
              <span style={{ color: "var(--mut)" }}>—</span>
              <input
                value={f.pMax}
                onChange={(e) => patch({ pMax: e.target.value })}
                inputMode="numeric"
                placeholder="2,000,000"
              />
            </div>
            <div className={styles.chips}>
              {PRICE_CHIPS.map(([l, a, b]) => (
                <button key={l} onClick={() => patch({ pMin: a, pMax: b })}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className="eyebrow">ТӨРӨЛ</div>
            <div className={styles.segment}>
              {TYPES.map(([k, l]) => (
                <button key={k} data-active={f.type === k} onClick={() => patch({ type: k })}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section} style={{ gap: 14, borderBottom: 0 }}>
            <button
              className={styles.switchRow}
              style={{ fontSize: 14 }}
              onClick={() => patch({ inStock: !f.inStock })}
            >
              Зөвхөн нөөцөд байгаа
              <Switch on={f.inStock} />
            </button>
            <button className={styles.clearBtn} onClick={props.clear}>
              Шүүлтүүр цэвэрлэх
            </button>
          </div>
        </aside>

        <div className={`only-mobile ${styles.sheetFoot}`}>
          <button className={styles.footClear} onClick={props.clear}>
            Цэвэрлэх
          </button>
          <button className={styles.footApply} onClick={props.closeSheet}>
            {props.resultCount} бараа харах
          </button>
        </div>
      </div>
    </div>
  );
}
