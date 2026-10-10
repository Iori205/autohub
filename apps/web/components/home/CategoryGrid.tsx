import Link from "next/link";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { shopHref } from "../../lib/site";
import type { Category } from "../../lib/types";
import { CATEGORY_ICONS } from "../icons";
import styles from "./CategoryGrid.module.css";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  const tiles = [
    ...categories.map((c) => ({
      key: c.key,
      name: c.name,
      count: c.countLabel,
      Icon: CATEGORY_ICONS[c.key],
      href: shopHref({ cat: c.key }),
    })),
    { key: "all", name: "Бүх ангилал", count: "40,000+ бараа", Icon: LayoutGrid, href: shopHref() },
  ];
  return (
    <div className={styles.grid}>
      {tiles.map(({ key, name, count, Icon, href }) => (
        <Link key={key} href={href} className={styles.tile}>
          <div className={styles.top}>
            <span className={styles.icon}>
              <Icon size={22} />
            </span>
            <ArrowUpRight size={16} className={styles.arrow} />
          </div>
          <div>
            <div className={styles.name}>{name}</div>
            <div className={styles.count}>{count}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
