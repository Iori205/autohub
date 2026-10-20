"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Car, LogOut, Receipt, User, UserRoundCheck } from "lucide-react";
import { logout, useCustomer } from "../../lib/api/auth";
import { useOrders } from "../../lib/api/orders";
import { FINDER_HREF } from "../../lib/site";
import { showToast, useShop } from "../../lib/store/shop";
import styles from "./AccountMenu.module.css";

/** Толгойн бүртгэлийн товч: нэвтрээгүй → /login; нэвтэрсэн → нэр, захиалга, хадгалсан машин, «Гарах» бүхий цэс. */
export function AccountMenu({ className = "" }: { className?: string }) {
  const router = useRouter();
  const me = useCustomer();
  const { car } = useShop();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!me)
    return (
      <Link href="/login" className={`icon-btn ${className}`} title="Нэвтрэх" aria-label="Нэвтрэх">
        <User size={18} />
      </Link>
    );

  const first = (me.name ?? "").trim().split(/\s+/)[0] ?? "";
  const close = () => setOpen(false);
  const signOut = async () => {
    close();
    try {
      await logout();
      router.push("/");
    } catch {
      showToast("Гарах үед алдаа гарлаа. Дахин оролдоно уу");
    }
  };

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        className={`icon-btn ${className}`}
        data-open={open}
        onClick={() => setOpen((v) => !v)}
        title={me.name ?? "Профайл"}
        aria-label="Профайл"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserRoundCheck size={18} />
        <span className={styles.onlineDot} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.who}>
            <span className={styles.avatar}>{first.charAt(0).toUpperCase()}</span>
            <div className={styles.whoText}>
              <div className={styles.name}>{me.name}</div>
              <div className={styles.phone}>{me.phone}</div>
            </div>
          </div>
          <Link href="/account/orders" className={styles.item} role="menuitem" onClick={close}>
            <Receipt size={18} className={styles.icon} />
            <span className={styles.label}>Миний захиалгууд</span>
            <OrderCount />
          </Link>
          <Link href={FINDER_HREF} className={styles.item} role="menuitem" onClick={close}>
            <Car size={18} className={styles.icon} />
            <span className={styles.label}>Хадгалсан машин</span>
            <span className={styles.meta}>{car ? `${car.make} ${car.model}` : "Сонгоогүй"}</span>
          </Link>
          <div className={styles.sep} />
          <button className={`${styles.item} ${styles.danger}`} role="menuitem" onClick={signOut}>
            <LogOut size={18} />
            <span className={styles.label}>Гарах</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Цэс нээлттэй үед л ачаална, тиймээс хаалттай цэс хүсэлт илгээхгүй. */
function OrderCount() {
  const orders = useOrders();
  return <span className={styles.meta}>{orders?.length ? orders.length : ""}</span>;
}
