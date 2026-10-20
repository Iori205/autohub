import Link from "next/link";
import { shopHref } from "../../lib/site";
import styles from "./BrandStrip.module.css";

/** Desktop дээр grid, гар утсанд хэвтээ гүйдэг жагсаалт. */
export function BrandStrip({ brands }: { brands: string[] }) {
  return (
    <div className={styles.strip}>
      {brands.map((b) => (
        <Link key={b} href={shopHref({ brand: b })} className={styles.tile}>
          {b}
        </Link>
      ))}
    </div>
  );
}
