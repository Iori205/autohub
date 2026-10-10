import type { CSSProperties } from "react";
import type { Product } from "../../lib/types";
import { CATEGORY_ICONS } from "../icons";
import styles from "./ProductImage.module.css";

/**
 * Product image slot. Until the API delivers photos (`product.images`) it draws
 * the design's striped placeholder with a faint category glyph.
 */
export function ProductImage({
  product,
  index = 0,
  iconSize = 40,
  className = "",
  style,
}: {
  product: Product;
  index?: number;
  iconSize?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const src = product.images?.[index];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote CDN images arrive with the API
      <img src={src} alt={product.name} className={`${styles.img} ${className}`} style={style} />
    );
  }
  const Icon = CATEGORY_ICONS[product.category];
  return (
    <div className={`striped ${styles.ph} ${className}`} style={style} role="img" aria-label={product.name}>
      <Icon size={iconSize} strokeWidth={1.25} className={styles.glyph} />
    </div>
  );
}
