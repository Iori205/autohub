"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Car,
  Heart,
  MapPin,
  Menu,
  Moon,
  Phone,
  Search,
  ShoppingCart,
  Sun,
  User,
  X,
} from "lucide-react";
import { carLabel } from "../../lib/catalog";
import { fmt } from "../../lib/format";
import { FINDER_HREF, STORE_HOURS, STORE_PHONE, shopHref } from "../../lib/site";
import { cartTotals, setCar, useShop } from "../../lib/store/shop";
import { toggleTheme, useTheme } from "../../lib/store/theme";
import type { Category, CategoryKey } from "../../lib/types";
import { Logo } from "./Logo";
import { MobileDrawer } from "./MobileDrawer";
import styles from "./Header.module.css";

const QUICK_CATS: CategoryKey[] = ["brake", "filter", "oil", "battery"];

export function Header({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { cart, wish, car } = useShop();
  const theme = useTheme();
  const { count, subtotal } = cartTotals(cart);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);

  const search = () => router.push(shopHref({ q: q.trim() || undefined }));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };
  const clearCar = () => setCar(null);

  return (
    <>
      <header className={styles.header}>
        {/* ---------- desktop / tablet ---------- */}
        <div className="not-mobile">
          <div className={styles.topbar}>
            <div className={`container ${styles.topbarInner}`}>
              <div className={styles.topbarGroup}>
                <span className={styles.iconText}>
                  <MapPin size={13} />
                  Улаанбаатар, Хан-Уул дүүрэг
                </span>
                <span className="only-wide">{STORE_HOURS}</span>
              </div>
              <div className={styles.topbarGroup}>
                <span className={styles.iconText}>
                  <Phone size={13} />
                  {STORE_PHONE}
                </span>
                <div className={`only-wide ${styles.topbarLinks}`}>
                  <a href="#">Хүргэлт</a>
                  <a href="#">Баталгаа</a>
                  <a href="#">Тусламж</a>
                </div>
              </div>
            </div>
          </div>

          <div className={`container ${styles.main}`}>
            <Logo size="lg" />
            <div className={styles.search}>
              <Search size={18} className={styles.searchIcon} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Сэлбэгийн нэр, код, OEM дугаараар хайх"
              />
              <button onClick={search}>Хайх</button>
            </div>
            <div className={styles.actions}>
              <button className="icon-btn" onClick={toggleTheme} title="Горим солих">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="icon-btn" title="Хадгалсан">
                <Heart size={18} />
                {wish.length > 0 && (
                  <span className="badge-count" style={{ top: -5, right: -5 }}>
                    {wish.length}
                  </span>
                )}
              </button>
              <Link href="/cart" className={styles.cartBtn}>
                <span className={styles.cartIcon}>
                  <ShoppingCart size={18} />
                  {count > 0 && <span className={styles.cartBadge}>{count}</span>}
                </span>
                <span className={styles.cartText}>
                  <span>Миний сагс</span>
                  <b>{fmt(subtotal)}</b>
                </span>
              </Link>
              <Link href="/account/orders" className={styles.accountBtn}>
                <User size={16} />
                <span className="only-wide">Миний захиалгууд</span>
                <span className="not-wide">Профайл</span>
              </Link>
            </div>
          </div>

          <div className={styles.navRow}>
            <nav className={`container ${styles.nav}`}>
              <Link href={FINDER_HREF} className={styles.finderLink}>
                <Car size={16} />
                Машинаа сонгох
              </Link>
              <Link href={shopHref()}>Дэлгүүр</Link>
              <Link href={shopHref({ sale: true })} className={styles.saleLink}>
                Хямдрал<span className={styles.saleTag}>−20%</span>
              </Link>
              <div className={`only-wide ${styles.quickCats}`}>
                <span className={styles.divider} />
                {QUICK_CATS.map((k) => (
                  <Link key={k} href={shopHref({ cat: k })}>
                    {categories.find((c) => c.key === k)?.name}
                  </Link>
                ))}
              </div>
              {car && (
                <div className={`ok-pill ${styles.carPill}`}>
                  <Car size={14} className={styles.okIcon} />
                  <span className={styles.carPillLabel}>Миний машин:</span>
                  <span className={styles.ellipsis}>{carLabel(car)}</span>
                  <button onClick={clearCar} aria-label="Машин арилгах">
                    <X size={12} />
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* ---------- mobile ---------- */}
        <div className={`only-mobile ${styles.mobile}`}>
          <div className={styles.mobileTop}>
            <Logo size="md" />
            <Link href="/cart" className={`icon-btn ${styles.mBtn}`} title="Миний сагс">
              <ShoppingCart size={19} />
              {count > 0 && <span className={styles.mBadge}>{count}</span>}
            </Link>
            <button
              className={`icon-btn ${styles.mBtnPlain}`}
              onClick={() => setDrawer(true)}
              title="Цэс"
            >
              <Menu size={20} />
            </button>
          </div>
          <div className={styles.mSearch}>
            <Search size={16} className={styles.searchIcon} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              enterKeyHint="search"
              placeholder="Нэр, код, OEM дугаараар хайх"
            />
          </div>
          {car && (
            <div className={`ok-pill ${styles.mCarPill}`}>
              <Car size={14} className={styles.okIcon} />
              <span className={styles.ellipsis} style={{ flex: 1 }}>
                {carLabel(car)}
              </span>
              <button onClick={clearCar} aria-label="Машин арилгах">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </header>

      <MobileDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        categories={categories}
      />
    </>
  );
}
