import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { APP_NAME } from "../../lib/site";
import styles from "./Shell.module.css";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  crumbs = [],
  title,
  sub,
  actions,
}: {
  crumbs?: Crumb[];
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  const all: Crumb[] = [{ label: APP_NAME, href: "/" }, ...crumbs];
  return (
    <div className={styles.pageHead}>
      <div className={styles.pageHeadText}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          {all.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight size={14} />}
              {c.href && i < all.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </Fragment>
          ))}
        </nav>
        <h1 className={styles.pageTitle}>{title}</h1>
        {sub && <div className={styles.pageSub}>{sub}</div>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  );
}
