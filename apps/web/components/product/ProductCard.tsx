"use client";

import Link from "next/link";
import { Check, GitCompare, Heart, ShoppingCart } from "lucide-react";
import { fitStatus, stockColor, stockText } from "../../lib/catalog";
import { brandInitials, discountPct, fmt } from "../../lib/format";
import { productHref } from "../../lib/site";
import { addToCart, toggleCompare, toggleWish, useShop } from "../../lib/store/shop";
import type { Product } from "../../lib/types";
import { FitBadge } from "./FitBadge";
import { ProductImage } from "./ProductImage";
import styles from "./ProductCard.module.css";

export function ProductCard({ product: p }: { product: Product }) {
  const { car, wish, compare, added } = useShop();
  const fit = fitStatus(p, car);
  const wished = wish.includes(p.id);
  const compared = compare.includes(p.id);
  const justAdded = added === p.id;
  const href = productHref(p.id);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Link href={href} className={styles.mediaLink} aria-label={p.name}>
          <ProductImage product={p} className={styles.img} />
        </Link>
        <div className={styles.badges}>
          {p.genuine ? (
            <span className={`${styles.badge} ${styles.orig}`}>Оригинал</span>
          ) : (
            <span className={`${styles.badge} ${styles.analog}`}>Аналог</span>
          )}
          {p.oldPrice && (
            <span className={`${styles.badge} ${styles.sale}`}>
              {discountPct(p.price, p.oldPrice)}
            </span>
          )}
        </div>
        <button
          className={styles.heart}
          style={{ color: wished ? "var(--accent)" : "var(--mut)" }}
          onClick={() => toggleWish(p.id)}
          title="Хадгалах"
        >
          <Heart size={16} fill={wished ? "currentColor" : "none"} />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.brandRow}>
          <span className={`not-mobile ${styles.brandMark}`}>{brandInitials(p.brand)}</span>
          <span className={styles.brand}>{p.brand}</span>
        </div>
        <Link href={href} className={styles.name}>
          {p.name}
        </Link>
        <div className={`mono ${styles.oem}`}>OEM: {p.oem}</div>
        {fit && (
          <div className={styles.fitRow}>
            <FitBadge status={fit} responsive />
          </div>
        )}
        <div style={{ flex: 1 }} />

        {/* desktop хөл */}
        <div className="not-mobile">
          <div className={styles.priceBlock}>
            <div className={styles.priceRow}>
              <span className={styles.price}>{fmt(p.price)}</span>
              {p.oldPrice && <span className={styles.old}>{fmt(p.oldPrice)}</span>}
            </div>
            <span className={styles.stock} style={{ color: stockColor(p) }}>
              {stockText(p)}
            </span>
          </div>
          <button className={styles.add} onClick={() => addToCart(p)}>
            <ShoppingCart size={16} />
            {justAdded ? "Сагсанд нэмэгдлээ" : "Сагслах"}
          </button>
          <button
            className={styles.compare}
            style={{ color: compared ? "var(--accent)" : "var(--mut)" }}
            onClick={() => toggleCompare(p.id)}
          >
            <GitCompare size={14} />
            {compared ? "Харьцуулалтад нэмсэн" : "Харьцуулах"}
          </button>
        </div>

        {/* гар утасны хөл */}
        <div className={`only-mobile ${styles.mFoot}`}>
          <div className={styles.mPrice}>
            <span className={styles.price}>{fmt(p.price)}</span>
            {p.oldPrice && <span className={styles.mOld}>{fmt(p.oldPrice)}</span>}
            <span className={styles.mStock} style={{ color: stockColor(p) }}>
              {stockText(p)}
            </span>
          </div>
          <button
            className={styles.mAdd}
            onClick={() => addToCart(p)}
            title={justAdded ? "Сагсанд нэмэгдлээ" : "Сагслах"}
          >
            {justAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
