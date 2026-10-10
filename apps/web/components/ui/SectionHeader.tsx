import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./SectionHeader.module.css";

export function SectionHeader({
  title,
  href,
  aside,
}: {
  title: string;
  href?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={styles.head}>
      <h2 className="section-title">{title}</h2>
      {href ? (
        <Link href={href} className={styles.more}>
          Бүгдийг үзэх
          <ArrowRight size={15} />
        </Link>
      ) : (
        aside && <span className={styles.aside}>{aside}</span>
      )}
    </div>
  );
}
