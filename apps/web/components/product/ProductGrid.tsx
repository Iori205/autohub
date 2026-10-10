import type { Product } from "../../lib/types";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";

/** 2 columns on mobile, auto-fill above. `min` = min card width on desktop. */
export function ProductGrid({
  products,
  min = 260,
}: {
  products: Product[];
  min?: number;
}) {
  return (
    <div
      className={styles.grid}
      style={{ "--card-min": `${min}px` } as React.CSSProperties}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
