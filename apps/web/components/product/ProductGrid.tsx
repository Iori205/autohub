import type { Product } from "../../lib/types";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";

/** Гар утсанд 2 багана, түүнээс дээш auto-fill. `min` = desktop дээрх картын хамгийн бага өргөн. */
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
