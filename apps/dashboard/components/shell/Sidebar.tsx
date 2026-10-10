"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useDb } from "../../lib/db";
import { toProcess } from "../../lib/metrics";
import { NAV, isActive } from "../../lib/nav";
import { Logo } from "./Logo";
import styles from "./Shell.module.css";

export function Sidebar({
  onToggle,
  collapsed,
  open,
}: {
  onToggle: () => void;
  collapsed: boolean;
  open: boolean;
}) {
  const pathname = usePathname();
  const db = useDb();
  const paid = db ? toProcess(db.orders).length : 0;
  // Whether the rail is narrow is decided by CSS (breakpoint + state); this only picks the icon.
  const ToggleIcon = collapsed && !open ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside className={styles.side} aria-label="Үндсэн цэс">
      <Link href="/" className={styles.sideTop} aria-label="Хянах самбар">
        <Logo />
      </Link>
      <nav className={styles.nav}>
        {NAV.map((g) => (
          <div key={g.label} className={styles.group}>
            <div className={styles.groupLabel}>
              <span className="side-label">{g.label}</span>
            </div>
            {g.items.map((n) => {
              const on = isActive(n.href, pathname);
              const Icon = n.icon;
              const count = n.badge === "orders" ? paid : 0;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  title={n.label}
                  className={styles.navItem}
                  data-active={on}
                  aria-current={on ? "page" : undefined}
                >
                  <Icon size={18} className={styles.navIcon} />
                  <span className={`${styles.navLabel} side-label`}>{n.label}</span>
                  {count > 0 && (
                    <>
                      <span className={`${styles.navBadge} side-label`}>{count}</span>
                      <span className={styles.navDot} />
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={styles.sideFoot}>
        <button className={styles.navItem} onClick={onToggle} title="Цэс хураах">
          <ToggleIcon size={18} className={styles.navIcon} />
          <span className={`${styles.navLabel} side-label`}>Цэс хураах</span>
        </button>
      </div>
    </aside>
  );
}
