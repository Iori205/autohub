"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Car,
  ChevronRight,
  CircleCheck,
  GitCompare,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { carLabel, fitStatus, stockColor, stockText } from "../../lib/catalog";
import { brandInitials, discountPct, fmt } from "../../lib/format";
import { FINDER_HREF, shopHref } from "../../lib/site";
import { addToCart, toggleCompare, toggleWish, useShop } from "../../lib/store/shop";
import type { Product, VehicleModel } from "../../lib/types";
import { ProductImage } from "./ProductImage";
import styles from "./ProductDetail.module.css";

const GALLERY_SIZE = 4;
const TABS = [
  ["desc", "Тодорхойлолт"],
  ["spec", "Техник үзүүлэлт"],
  ["fit", "Тохирох машинууд"],
  ["oem", "OEM дугаарууд"],
] as const;
type Tab = (typeof TABS)[number][0];

export function ProductDetail({
  product: p,
  categoryName,
  fitRows,
}: {
  product: Product;
  categoryName: string;
  fitRows: VehicleModel[];
}) {
  const { car, wish, compare, added } = useShop();
  const [gi, setGi] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("desc");

  const fit = fitStatus(p, car);
  const justAdded = added === p.id;
  const stockCol = stockColor(p);
  const pct = discountPct(p.price, p.oldPrice);
  const label = carLabel(car);

  const desc = `${p.brand} брэндийн ${p.name.toLowerCase()}. ${
    p.genuine
      ? "Үйлдвэрийн оригинал сэлбэг бөгөөд машины анхны тохиргоонд яг тохирно."
      : "Олон улсын чанарын стандартад нийцсэн, OEM үзүүлэлттэй ижил баталгаат аналог сэлбэг."
  } ${p.fits.join(", ")} загварт тохирно. Монголын хүйтэн уур амьсгалд туршигдсан. Захиалахаасаа өмнө машиныхаа VIN дугаарыг онлайн зөвлөхөөр шалгуулахыг зөвлөж байна.`;

  const specs: [string, string][] = [
    ["Брэнд", p.brand],
    ["OEM дугаар", p.oem],
    ["Төрөл", p.genuine ? "Оригинал" : "Аналог"],
    ["Ангилал", categoryName],
    ...p.specs,
    ["Баталгаа", p.genuine ? "12 сар" : "6 сар"],
  ];
  const xref = [...new Set([p.oem, ...p.crossRefs])];
  const add = () => addToCart(p, qty);

  return (
    <div>
      <div className={styles.crumbs}>
        <Link href="/">Нүүр</Link>
        <ChevronRight size={13} />
        <Link href={shopHref({ cat: p.category })}>{categoryName}</Link>
        <ChevronRight size={13} />
        <span className="here">{p.name}</span>
      </div>

      <div className={styles.top}>
        {/* desktop gallery */}
        <div className={`not-mobile ${styles.gallery}`}>
          <div className={styles.main}>
            <ProductImage product={p} index={gi} iconSize={96} className={styles.fill} />
            {pct && <span className={styles.pct}>{pct}</span>}
          </div>
          <div className={styles.thumbs}>
            {Array.from({ length: GALLERY_SIZE }, (_, i) => (
              <button
                key={i}
                onClick={() => setGi(i)}
                className={styles.thumb}
                data-active={i === gi}
                aria-label={`Зураг ${i + 1}`}
              >
                <ProductImage product={p} index={i} iconSize={22} className={styles.fill} />
              </button>
            ))}
          </div>
        </div>

        {/* mobile swipe gallery */}
        <div className={`only-mobile ${styles.mGallery}`}>
          <div
            className={styles.mTrack}
            onScroll={(e) => {
              const t = e.currentTarget;
              const i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
              if (i !== gi) setGi(i);
            }}
          >
            {Array.from({ length: GALLERY_SIZE }, (_, i) => (
              <div key={i} className={styles.mSlide}>
                <ProductImage product={p} index={i} iconSize={80} className={styles.fill} />
              </div>
            ))}
          </div>
          {pct && <span className={styles.pct}>{pct}</span>}
          <span className={`mono ${styles.counter}`}>
            {gi + 1} / {GALLERY_SIZE}
          </span>
          <div className={styles.dots}>
            {Array.from({ length: GALLERY_SIZE }, (_, i) => (
              <span key={i} data-active={i === gi} />
            ))}
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.badges}>
            <span className={styles.brandChip}>
              <span className={styles.brandMark}>{brandInitials(p.brand)}</span>
              <span>{p.brand}</span>
            </span>
            {p.genuine ? (
              <span className={`${styles.tag} ${styles.orig}`}>Оригинал</span>
            ) : (
              <span className={styles.tag}>Аналог</span>
            )}
          </div>
          <h1 className={styles.title}>{p.name}</h1>
          <div className={`mono ${styles.codes}`}>
            <span>
              OEM: <b>{p.oem}</b>
            </span>
            <span>
              Код: <b>SB-{10000 + p.id * 37}</b>
            </span>
          </div>

          {fit === "yes" && (
            <div className={`ok-pill ${styles.fitBox} ${styles.fitYes}`}>
              <CircleCheck size={18} />
              Таны {label} машинд тохирно
            </div>
          )}
          {fit && fit !== "yes" && (
            <div className={`${styles.fitBox} ${styles.fitNot}`}>
              <TriangleAlert size={18} style={{ color: "var(--danger)" }} />
              Таны {label} машинд тохирохгүй байж магадгүй — зөвлөхөөс асуугаарай
            </div>
          )}
          {!car && (
            <Link href={FINDER_HREF} className={`${styles.fitBox} ${styles.fitPick}`}>
              <Car size={18} />
              Машинаа сонгоод тохирохыг шалгах
              <ArrowRight size={16} style={{ marginLeft: "auto" }} />
            </Link>
          )}

          <div className={styles.buyBox}>
            <div className={styles.priceRow}>
              <span className={styles.price}>{fmt(p.price)}</span>
              {p.oldPrice && <span className={styles.old}>{fmt(p.oldPrice)}</span>}
              <span className={styles.stock} style={{ color: stockCol }}>
                <span className={styles.stockDot} style={{ background: stockCol }} />
                {stockText(p)}
              </span>
            </div>
            <div className={styles.buyRow}>
              <div className={styles.qty}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Хасах">
                  <Minus size={16} />
                </button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Нэмэх">
                  <Plus size={16} />
                </button>
              </div>
              <button className={styles.addBtn} onClick={add}>
                <ShoppingCart size={17} />
                {justAdded ? "Сагсанд нэмэгдлээ" : "Сагслах"}
              </button>
              <button
                className={styles.sqBtn}
                style={{ color: wish.includes(p.id) ? "var(--accent)" : "var(--mut)" }}
                onClick={() => toggleWish(p.id)}
                title="Хадгалах"
              >
                <Heart size={18} />
              </button>
              <button
                className={styles.sqBtn}
                style={{ color: compare.includes(p.id) ? "var(--accent)" : "var(--mut)" }}
                onClick={() => toggleCompare(p.id)}
                title="Харьцуулах"
              >
                <GitCompare size={18} />
              </button>
            </div>
            <div className={styles.perks}>
              <span>
                <Truck size={15} />
                УБ-т 24 цагт хүргэнэ
              </span>
              <span>
                <Store size={15} />
                Салбараас ирж авах үнэгүй
              </span>
              <span>
                <ShieldCheck size={15} />
                {p.genuine ? "12 сарын" : "6 сарын"} баталгаа
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.tabsSection}>
        <div className={styles.tabs} role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              data-active={tab === k}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className={styles.tabBody}>
          {tab === "desc" && <p className={styles.desc}>{desc}</p>}
          {tab === "spec" && (
            <div className={styles.table}>
              {specs.map(([k, v]) => (
                <div key={k} className={styles.specRow}>
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "fit" && (
            <div className={styles.table} style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 560 }}>
                <div className={`${styles.fitRow} ${styles.fitHead}`}>
                  <span>ҮЙЛДВЭРЛЭГЧ</span>
                  <span>ЗАГВАР</span>
                  <span>ОН</span>
                  <span>ХӨДӨЛГҮҮР</span>
                </div>
                {fitRows.map((r) => (
                  <div
                    key={r.model}
                    className={styles.fitRow}
                    data-mine={car?.model === r.model}
                  >
                    <span>{r.make}</span>
                    <span style={{ fontWeight: 700 }}>{r.model}</span>
                    <span className="mono">
                      {r.yearFrom}–{r.yearTo}
                    </span>
                    <span className="mono">{r.engines.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "oem" && (
            <>
              <div className={styles.xrefs}>
                {xref.map((x) => (
                  <span key={x} className="mono">
                    {x}
                  </span>
                ))}
              </div>
              <p className={styles.xrefNote}>
                Дээрх дугаарууд нь энэ бараатай солигдох боломжтой хөндлөн лавлагаа
                (cross-reference) юм.
              </p>
            </>
          )}
        </div>
      </section>

      {/* mobile sticky buy bar */}
      <div className={`only-mobile ${styles.bar}`} data-detail-bar>
        <div className={styles.barPrice}>
          <span>{fmt(p.price)}</span>
          <span style={{ color: stockCol }}>{stockText(p)}</span>
        </div>
        <button className={styles.barBtn} onClick={add}>
          <ShoppingCart size={17} />
          {justAdded ? "Сагсанд нэмэгдлээ" : "Сагсанд нэмэх"}
        </button>
      </div>
    </div>
  );
}
