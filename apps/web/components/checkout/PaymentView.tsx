"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CircleCheck, Info, Lock, QrCode, Wallet } from "lucide-react";
import { useOrder } from "../../lib/api/orders";
import { fmt, fmtDateTime } from "../../lib/format";
import { useNow } from "../../lib/hooks";
import { orderView } from "../../lib/orders";
import { QPayModal } from "../payment/QPayModal";
import { CheckoutSteps } from "./CheckoutSteps";
import { DeliveryNote, ItemRows, QPayBadge, orderItems } from "./parts";
import c from "./checkout.module.css";
import styles from "./PaymentView.module.css";

export function OrderMissing({ step }: { step: 3 | 4 }) {
  return (
    <main className={`container ${c.page}`}>
      <CheckoutSteps step={step} />
      <div className={c.empty}>
        <div className={c.emptyTitle}>Захиалга олдсонгүй</div>
        <div className={c.emptyActions} style={{ marginTop: 16 }}>
          <Link href="/account/orders" className="btn">
            Миний захиалгууд
          </Link>
        </div>
      </div>
    </main>
  );
}

export function PaymentView({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const order = useOrder(orderNo);
  const now = useNow(1000);
  const [qpay, setQpay] = useState(false);

  const onPaid = useCallback(
    (no: string) => router.push(`/checkout/success?order=${no}`),
    [router],
  );
  const closeQpay = useCallback(() => setQpay(false), []);

  if (order === undefined) return <main className={`container ${c.page}`} />;
  if (order === null) return <OrderMissing step={3} />;

  const v = orderView(order, now);

  return (
    <main className={`container ${c.page}`}>
      <CheckoutSteps step={3} />
      <div className={c.layout}>
        <div className={c.mainCol} style={{ gap: 18 }}>
          <div className={styles.intro}>
            <span className={`mono ${styles.created}`}>
              <CircleCheck size={14} />
              <span>ЗАХИАЛГА ҮҮСЛЭЭ</span>
              <span>· {fmtDateTime(order.created)}</span>
            </span>
            <h1 className={styles.title}>Захиалга #{order.no}</h1>
            <p className={styles.lede}>
              Төлбөр төлөгдсөн даруйд захиалга баталгаажиж, бэлтгэгдэж эхэлнэ.
            </p>
          </div>

          {v.failed && (
            <div className={styles.failed}>
              <Info size={18} style={{ color: v.statusColor }} />
              <span>
                <b>{v.statusLabel}.</b> Доорх товчийг дарж шинэ нэхэмжлэх үүсгэнэ үү.
              </span>
            </div>
          )}

          <section className={`panel ${styles.methods}`}>
            <h2 className="panel-title" style={{ marginBottom: 4 }}>
              Төлбөрийн хэрэгсэл
            </h2>
            <div className={styles.method} data-on>
              <span className={styles.radio}>
                <span />
              </span>
              <QPayBadge size="lg" />
              <div className={styles.methodText}>
                <div className={styles.methodTitle}>
                  <span>QPay</span>
                  <span className={styles.recommend}>Санал болгох</span>
                </div>
                <div className={styles.methodSub}>
                  Бүх банкны апп, MonPay, SocialPay-ээр QR уншуулж төлнө
                </div>
              </div>
            </div>
            <div className={`${styles.method} ${styles.disabled}`}>
              <span className={styles.radio} />
              <span className={styles.walletIcon}>
                <Wallet size={18} />
              </span>
              <div className={styles.methodText}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Бусад төлбөрийн хэрэгсэл</div>
                <div className={styles.methodSub}>Удахгүй нэмэгдэнэ</div>
              </div>
              <span className={styles.soon}>Удахгүй</span>
            </div>
          </section>

          {v.isPaid ? (
            <Link href={`/checkout/success?order=${order.no}`} className={styles.payBtn}>
              <CircleCheck size={20} />
              {v.statusLabel}
            </Link>
          ) : (
            <button className={styles.payBtn} onClick={() => setQpay(true)}>
              <QrCode size={20} />
              {v.payButton} · {fmt(order.total)}
            </button>
          )}
          <div className={styles.secure}>
            <Lock size={13} />
            Төлбөр QPay-ийн аюулгүй системээр дамжина. Бид таны банкны мэдээллийг
            хадгалахгүй.
          </div>
        </div>

        <aside className={c.aside}>
          <div className="eyebrow">ЗАХИАЛГЫН ДЭЛГЭРЭНГҮЙ</div>
          <ItemRows items={orderItems(order)} />
          <div className={`${c.totals} ${c.totalsDivided}`}>
            <div className={c.kv}>
              <span>Барааны дүн</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            <div className={c.kv}>
              <span>Хүргэлтийн төлбөр</span>
              <span>{order.shipping ? fmt(order.shipping) : "Үнэгүй"}</span>
            </div>
            <div className={c.grand}>
              <span>Нийт төлөх</span>
              <span className={c.grandValue}>{fmt(order.total)}</span>
            </div>
          </div>
          <DeliveryNote order={order} withContact />
        </aside>
      </div>

      {qpay && <QPayModal orderNo={order.no} onClose={closeQpay} onPaid={onPaid} />}
    </main>
  );
}
