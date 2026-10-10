"use client";

import { useRouter } from "next/navigation";
import {
  Banknote,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Package,
  PackageX,
  ReceiptText,
  Search,
  Settings,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { logout } from "../../lib/api/auth";
import { useDb } from "../../lib/db";
import { digits, initials, money, shortName } from "../../lib/format";
import { customerById, lowStock, toProcess } from "../../lib/metrics";
import { toggleTheme, useTheme } from "../../lib/prefs";
import { toast } from "../../lib/ui";
import type { Session } from "../../lib/types";
import styles from "./Shell.module.css";

interface Hit {
  icon: LucideIcon;
  kind: string;
  title: string;
  sub: string;
  href: string;
}

export function Header({ session, onMenu }: { session: Session; onMenu: () => void }) {
  const router = useRouter();
  const db = useDb();
  const theme = useTheme();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState<"notif" | "user" | null>(null);
  const [readAt, setReadAt] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenu(null);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const query = q.trim().toLowerCase();
  const hits = useMemo<Hit[]>(() => {
    if (!db || query.length < 2) return [];
    const qd = query.replace(/[-\s#.]/g, "");
    const cust = customerById(db.customers);
    const orders = db.orders
      .filter((o) => {
        const c = cust.get(o.customerId);
        return (
          o.id.toLowerCase().includes(qd) ||
          (!!c && (digits(c.phone).includes(qd) || c.name.toLowerCase().includes(query)))
        );
      })
      .slice(0, 4)
      .map((o) => {
        const c = cust.get(o.customerId);
        return {
          icon: ReceiptText,
          kind: "Захиалга",
          title: `#${o.id} · ${c?.name ?? "—"}`,
          sub: `${c?.phone ?? ""} · ${money(o.total)}`,
          href: `/orders/${o.id}`,
        };
      });
    const products = db.products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.oem.some((x) => x.toLowerCase().replace(/[-.\s]/g, "").includes(qd)),
      )
      .slice(0, 4)
      .map((p) => ({
        icon: Package,
        kind: "Бараа",
        title: p.name,
        sub: `${p.brand} · OEM ${p.oem[0]}`,
        href: `/products/${p.id}`,
      }));
    const customers =
      qd.length >= 3 && /^\d+$/.test(qd)
        ? db.customers
            .filter((c) => digits(c.phone).includes(qd))
            .slice(0, 2)
            .map((c) => ({ icon: User, kind: "Хэрэглэгч", title: c.name, sub: c.phone, href: `/customers?c=${c.id}` }))
        : [];
    return [...orders, ...products, ...customers];
  }, [db, query]);

  const notifs = useMemo(() => {
    if (!db) return [];
    const cust = customerById(db.customers);
    return [
      ...toProcess(db.orders).map((o) => ({
        key: o.id,
        icon: Banknote,
        tone: "green",
        unread: true,
        title: `Шинэ төлбөр орлоо · #${o.id}`,
        sub: `${cust.get(o.customerId)?.name ?? ""} · ${money(o.total)} · QPay`,
        time: o.createdAt.slice(11),
        href: `/orders/${o.id}`,
      })),
      ...lowStock(db.products)
        .slice(0, 5)
        .map((p) => ({
          key: "p" + p.id,
          icon: PackageX,
          tone: p.stock ? "amber" : "red",
          unread: false,
          title: p.stock ? "Нөөц дуусах дөхсөн" : "Нөөц дууссан",
          sub: `${p.name} · ${p.stock} ш үлдсэн`,
          time: "",
          href: "/inventory",
        })),
    ];
  }, [db]);
  // "Read" is remembered against the notification count at that moment.
  const unread = readAt === notifs.length ? 0 : notifs.length;

  const go = (href: string) => {
    setMenu(null);
    setSearchOpen(false);
    setQ("");
    router.push(href);
  };

  const showSearch = searchOpen && query.length >= 2;

  return (
    <header className={styles.header}>
      {(menu || showSearch) && (
        <div
          className={styles.menuScrim}
          onClick={() => {
            setMenu(null);
            setSearchOpen(false);
          }}
        />
      )}
      <button className={`${styles.hbtn} ${styles.burger}`} onClick={onMenu} aria-label="Цэс">
        <Menu size={19} />
      </button>
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && hits[0] && go(hits[0].href)}
          placeholder="Хайх: захиалга #, бараа, OEM, утас…"
          aria-label="Хайх"
        />
        <kbd className={styles.kbd}>/</kbd>
        {showSearch && (
          <div className={styles.dropdown} style={{ left: 0, right: 0, padding: 6 }}>
            {hits.map((h) => (
              <button key={h.kind + h.href} className={styles.hit} onClick={() => go(h.href)}>
                <h.icon size={18} className="faint" />
                <span className={styles.hitText}>
                  <span>{h.title}</span>
                  <span className="mono">{h.sub}</span>
                </span>
                <span className={styles.hitKind}>{h.kind}</span>
              </button>
            ))}
            {!hits.length && <div className={styles.noHits}>“{q}” — илэрц олдсонгүй</div>}
          </div>
        )}
      </div>
      <div className={styles.spacer} />
      <button className={styles.hbtn} onClick={toggleTheme} title="Загвар солих" aria-label="Загвар солих">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className={styles.rel}>
        <button
          className={styles.hbtn}
          onClick={() => setMenu(menu === "notif" ? null : "notif")}
          title="Мэдэгдэл"
          aria-label="Мэдэгдэл"
          aria-expanded={menu === "notif"}
        >
          <Bell size={18} />
          {unread > 0 && <span className={styles.notifCount}>{unread}</span>}
        </button>
        {menu === "notif" && (
          <div className={`${styles.dropdown} ${styles.notifMenu}`}>
            <div className={styles.dropHead}>
              <strong>Мэдэгдэл</strong>
              <button className="link-btn" onClick={() => setReadAt(notifs.length)}>
                Бүгдийг уншсан
              </button>
            </div>
            <div className={styles.notifList}>
              {notifs.map((n) => (
                <button
                  key={n.key}
                  className={styles.notif}
                  data-unread={n.unread && unread > 0}
                  onClick={() => go(n.href)}
                >
                  <span className={`${styles.notifIcon} tone-${n.tone}`}>
                    <n.icon size={17} />
                  </span>
                  <span className={styles.hitText}>
                    <span>{n.title}</span>
                    <span>{n.sub}</span>
                  </span>
                  <span className={styles.notifTime}>{n.time}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className={styles.vsep} />
      <div className={styles.rel}>
        <button
          className={styles.userBtn}
          onClick={() => setMenu(menu === "user" ? null : "user")}
          aria-expanded={menu === "user"}
        >
          <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
            {initials(session.name)}
          </span>
          <span className={styles.userText}>
            <span>{shortName(session.name)}</span>
            <span>{session.role === "admin" ? "Админ" : "Оператор"}</span>
          </span>
          <ChevronDown size={17} className="faint" />
        </button>
        {menu === "user" && (
          <div className={`${styles.dropdown} ${styles.userMenu}`}>
            <div className={styles.userHead}>
              <strong>{session.name}</strong>
              <span>{session.email}</span>
            </div>
            <button className={styles.menuItem} onClick={() => setMenu(null)}>
              <User size={17} />
              Миний профайл
            </button>
            <button className={styles.menuItem} onClick={() => go("/settings")}>
              <Settings size={17} />
              Тохиргоо
            </button>
            <button
              className={styles.menuItem}
              style={{ color: "var(--danger)" }}
              onClick={async () => {
                setMenu(null);
                await logout(); // AdminShell's guard then redirects to /login
                toast("Системээс гарлаа", "info");
              }}
            >
              <LogOut size={17} />
              Гарах
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
