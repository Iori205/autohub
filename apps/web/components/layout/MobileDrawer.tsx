"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Car,
  ChevronRight,
  Moon,
  Percent,
  Phone,
  Receipt,
  Store,
  User,
  X,
} from "lucide-react";
import {
  FINDER_HREF,
  shopHref,
} from "../../lib/site";
import { toggleTheme, useTheme } from "../../lib/store/theme";
import type { Category } from "../../lib/types";
import { CATEGORY_ICONS } from "../icons";
import { Logo } from "./Logo";
import { Switch } from "../ui/Switch";
import { useSite } from "../../lib/site-context";
import styles from "./MobileDrawer.module.css";

export function MobileDrawer({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const theme = useTheme();
  const site = useSite();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="only-mobile">
      <div
        className={styles.scrim}
        data-open={open}
        onClick={onClose}
        aria-hidden
      />
      <aside className={styles.drawer} data-open={open} aria-hidden={!open}>
        <div className={styles.head}>
          <Logo size="sm" onClick={onClose} />
          <button className={styles.close} onClick={onClose} title="Хаах">
            <X size={18} />
          </button>
        </div>

        <nav className={styles.group}>
          <Link href={FINDER_HREF} onClick={onClose} className={`${styles.item} ${styles.accent}`}>
            <Car size={19} />
            Машинаа сонгох
          </Link>
          <Link href={shopHref()} onClick={onClose} className={styles.item}>
            <Store size={19} className={styles.mutIcon} />
            Дэлгүүр
          </Link>
          <Link href={shopHref({ sale: true })} onClick={onClose} className={styles.item}>
            <Percent size={19} className={styles.mutIcon} />
            Хямдрал
            <span className={styles.saleTag}>−20%</span>
          </Link>
        </nav>

        <div className={styles.cats}>
          <div className={styles.catsTitle}>АНГИЛАЛ</div>
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.key];
            return (
              <Link
                key={c.key}
                href={shopHref({ cat: c.key })}
                onClick={onClose}
                className={styles.cat}
              >
                <Icon size={17} className={styles.catIcon} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <ChevronRight size={14} className={styles.mutIcon} />
              </Link>
            );
          })}
        </div>

        <div className={styles.group}>
          <Link href="/account/orders" onClick={onClose} className={styles.item}>
            <Receipt size={19} className={styles.mutIcon} />
            Миний захиалгууд
          </Link>
          <Link href="/account/orders" onClick={onClose} className={styles.item}>
            <User size={19} className={styles.mutIcon} />
            Нэвтрэх
          </Link>
          <button className={styles.item} onClick={toggleTheme}>
            <Moon size={19} className={styles.mutIcon} />
            <span style={{ flex: 1, textAlign: "left" }}>Харанхуй горим</span>
            <Switch on={theme === "dark"} size="lg" />
          </button>
        </div>

        <div className={styles.contact}>
          <a href={site.phoneHref} className={styles.phone}>
            <Phone size={17} className={styles.accentIcon} />
            {site.phone}
          </a>
          <span className={styles.hours}>{site.hours}</span>
        </div>
      </aside>
    </div>
  );
}
