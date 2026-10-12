"use client";

import Link from "next/link";
import { ArrowRight, Car, CircleCheck, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { FREE_SHIPPING_FROM, fitStatus, shippingFor } from "../../lib/catalog";
import { fmt } from "../../lib/format";
import { FINDER_HREF, productHref, shopHref } from "../../lib/site";
import { useHydrated } from "../../lib/hooks";
import { cartTotals, removeLine, setLineQty, useShop } from "../../lib/store/shop";
import { ProductImage } from "../product/ProductImage";
import { CheckoutSteps } from "./CheckoutSteps";
import { QPayBadge } from "./parts";
import c from "./checkout.module.css";
import styles from "./CartView.module.css";

export function CartView() {
  const { cart, car, delivery } = useShop();
  const { count, subtotal } = cartTotals(cart);
  const ship = shippingFor(subtotal, delivery);
  const showFreeBar = delivery === "ship" && subtotal < FREE_SHIPPING_FROM;
  const hydrated = useHydrated();

  return (
    <main className={`container ${c.page}`} data-checkout-flow>
      <CheckoutSteps step={1} />
      <h1 className={`page-title ${c.h1}`}>
        Миний сагс <small>({count})</small>
      </h1>

      {!hydrated ? null : count === 0 ? (
        <div className={c.empty}>
          <ShoppingCart size={40} style={{ color: "var(--mut)" }} />
          <div className={c.emptyTitle}>Таны сагс хоосон байна</div>
          <div style={{ color: "var(--mut)", marginBottom: 20 }}>
            Машинаа сонгоод тохирох сэлбэгээ олоорой.
          </div>
          <div className={c.emptyActions}>
            <Link href={FINDER_HREF} className="btn btn-primary">
              <Car size={17} />
              Машинаа сонгох
            </Link>
            <Link href={shopHref()} className="btn">
              Дэлгүүр үзэх
            </Link>
          </div>
        </div>
      ) : (
        <div className={c.layout}>
          <div className={c.mainCol} style={{ gap: 12 }}>
            {cart.map(({ product: p, qty }) => (
              <div key={p.id} className={styles.line}>
                <Link href={productHref(p.id)} className={styles.thumb} aria-label={p.name}>
                  <ProductImage product={p} iconSize={26} className={styles.fill} />
                </Link>
                <div className={styles.lineBody}>
                  <div className={styles.lineInfo}>
                    <span className={styles.meta}>
                      {p.brand} · {p.genuine ? "Оригинал" : "Аналог"}
                    </span>
                    <Link href={productHref(p.id)} className={styles.name}>
                      {p.name}
                    </Link>
                    <span className={`mono ${styles.oem}`}>OEM: {p.oem}</span>
                    {fitStatus(p, car) === "yes" && (
                      <span className={styles.fits}>
                        <CircleCheck size={13} />
                        Таны машинд тохирно
                      </span>
                    )}
                  </div>
                  <div className={styles.lineActions}>
                    <div className={styles.qty}>
                      <button onClick={() => setLineQty(p.id, qty - 1)} aria-label="Хасах">
                        <Minus size={15} />
                      </button>
                      <span>{qty}</span>
                      <button onClick={() => setLineQty(p.id, qty + 1)} aria-label="Нэмэх">
                        <Plus size={15} />
                      </button>
                    </div>
                    <div className={styles.lineTotal}>
                      <span>{fmt(p.price * qty)}</span>
                      <span>{fmt(p.price)} / ш</span>
                    </div>
                    <button
                      className={styles.remove}
                      onClick={() => removeLine(p.id)}
                      title="Устгах"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className={c.aside}>
            <div className="eyebrow">ТӨЛБӨРИЙН ДҮН</div>
            {showFreeBar && (
              <div className={styles.free}>
                <span>Үнэгүй хүргэлт хүртэл {fmt(FREE_SHIPPING_FROM - subtotal)} үлдлээ</span>
                <span className={styles.freeTrack}>
                  <span style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100)}%` }} />
                </span>
              </div>
            )}
            <div className={c.totals}>
              <div className={c.kv}>
                <span>Барааны дүн</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className={c.kv}>
                <span>Хүргэлтийн төлбөр</span>
                <span>{ship ? fmt(ship) : "Үнэгүй"}</span>
              </div>
              <div className={c.grand}>
                <span>Нийт</span>
                <span className={c.grandValue}>{fmt(subtotal + ship)}</span>
              </div>
            </div>
            <Link href="/checkout" className="btn btn-primary btn-lg">
              Захиалга хийх
              <ArrowRight size={17} />
            </Link>
            <div className={styles.qpNote}>
              <QPayBadge />
              Бүх банкны апп, MonPay, SocialPay-ээр QR уншуулж төлнө.
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
