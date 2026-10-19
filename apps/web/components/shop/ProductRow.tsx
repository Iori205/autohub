"use client";

import Link from "next/link";
import { GitCompare, Heart } from "lucide-react";
import { fitStatus, stockColor, stockText } from "../../lib/catalog";
import { fmt } from "../../lib/format";
import { productHref } from "../../lib/site";
import { addToCart, toggleCompare, toggleWish, useShop } from "../../lib/store/shop";
import type { Product } from "../../lib/types";
import { FitBadge } from "../product/FitBadge";
import { ProductImage } from "../product/ProductImage";
import styles from "./ProductRow.module.css";

export function ProductRow({ product: p }: { product: Product }) {
  const { car, wish, compare, added } = useShop();
  const fit = fitStatus(p, car);
  const href = productHref(p.id);

  return (
    <div className={styles.row}>
      <Link href={href} className={styles.thumb} aria-label={p.name}>
        <ProductImage product={p} iconSize={28} className={styles.img} />
      </Link>
      <div className={styles.info}>
        <div className={styles.meta}>
          <span>{p.brand}</span>
          {p.genuine ? (
            <span className={styles.orig}>Оригинал</span>
          ) : (
            <span className={styles.analog}>Аналог</span>
          )}
        </div>
        <Link href={href} className={styles.name}>
          {p.name}
        </Link>
        <div className={`mono ${styles.oem}`}>
          OEM: {p.oem} · {p.fits.length ? p.fits.join(", ") : "Тохирол тодорхойгүй"}
        </div>
        {fit && <FitBadge status={fit} className={styles.fit} />}
      </div>
      <div className={styles.buy}>
        <div className={styles.price}>{fmt(p.price)}</div>
        <div className={styles.stock} style={{ color: stockColor(p) }}>
          {stockText(p)}
        </div>
        <div className={styles.actions}>
          <button className={styles.add} onClick={() => addToCart(p)}>
            {added === p.id ? "Сагсанд нэмэгдлээ" : "Сагслах"}
          </button>
          <button
            className={styles.icon}
            style={{ color: wish.includes(p.id) ? "var(--accent)" : "var(--mut)" }}
            onClick={() => toggleWish(p.id)}
            title="Хадгалах"
          >
            <Heart size={16} />
          </button>
          <button
            className={styles.icon}
            style={{ color: compare.includes(p.id) ? "var(--accent)" : "var(--mut)" }}
            onClick={() => toggleCompare(p.id)}
            title="Харьцуулах"
          >
            <GitCompare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
