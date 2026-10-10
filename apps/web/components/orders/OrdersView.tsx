"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { QrCode } from "lucide-react";
import { useOrders } from "../../lib/api/orders";
import { fmt, fmtDateTime } from "../../lib/format";
import { useNow } from "../../lib/hooks";
import { orderView } from "../../lib/orders";
import { STORE_EMAIL, STORE_PHONE } from "../../lib/site";
import { showToast } from "../../lib/store/shop";
import { DeliveryNote, ItemRows, KvCard, StatusPill, Timeline, orderItems } from "../checkout/parts";
import { QPayModal } from "../payment/QPayModal";
import c from "../checkout/checkout.module.css";
import styles from "./OrdersView.module.css";

export function OrdersView({ initialNo }: { initialNo?: string }) {
  const orders = useOrders();
  const now = useNow(1000);
  const [selNo, setSelNo] = useState(initialNo);
  const [payNo, setPayNo] = useState<string | null>(null);

  const closePay = useCallback(() => setPayNo(null), []);
  const onPaid = useCallback((no: string) => {
    setPayNo(null);
    setSelNo(no);
    showToast("Төлбөр амжилттай төлөгдлөө");
  }, []);

  const list = orders ? [...orders].sort((a, b) => b.created - a.created) : [];
  const sel = list.find((o) => o.no === selNo) ?? list[0];

  return (
    <main className={`container ${c.page}`}>
      <nav className="crumbs">
        <Link href="/">Нүүр</Link>
        <span>›</span>
        <span>Профайл</span>
        <span>›</span>
        <span className="here">Миний захиалгууд</span>
      </nav>
      <h1 className={`page-title ${styles.title}`}>Миний захиалгууд</h1>

      {orders && !list.length && (
        <div className={styles.empty}>Одоогоор захиалга алга.</div>
      )}

      {sel && (
        <div className={styles.layout}>
          <div className={styles.list}>
            {list.map((o) => {
              const v = orderView(o, now);
              return (
                <div
                  key={o.no}
                  role="button"
                  tabIndex={0}
                  className={styles.card}
                  data-active={o.no === sel.no}
                  onClick={() => setSelNo(o.no)}
                  onKeyDown={(e) => e.key === "Enter" && setSelNo(o.no)}
                >
                  <div className={styles.cardTop}>
                    <span className={`mono ${styles.no}`}>#{o.no}</span>
                    <span className={styles.cardTotal}>{fmt(o.total)}</span>
                  </div>
                  <span className={styles.cardMeta}>
                    {fmtDateTime(o.created)} · {v.itemCount}
                  </span>
                  <div className={styles.cardBottom}>
                    <StatusPill label={v.statusLabel} color={v.statusColor} />
                    {v.canPay && (
                      <button
                        className={styles.smallPay}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayNo(o.no);
                        }}
                      >
                        <QrCode size={14} />
                        {v.payLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Detail
            key={sel.no}
            order={sel}
            now={now}
            onPay={() => setPayNo(sel.no)}
          />
        </div>
      )}

      {payNo && <QPayModal orderNo={payNo} onClose={closePay} onPaid={onPaid} />}
    </main>
  );
}

function Detail({
  order,
  now,
  onPay,
}: {
  order: Parameters<typeof orderView>[0];
  now: number;
  onPay: () => void;
}) {
  const v = orderView(order, now);
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div className={styles.detailDate}>{fmtDateTime(order.created)}</div>
          <div className={styles.detailTitle}>Захиалга #{order.no}</div>
        </div>
        <StatusPill label={v.statusLabel} color={v.statusColor} />
      </div>

      {v.canPay && (
        <div className={styles.payBanner}>
          <span className={`qpay-logo ${styles.payLogo}`}>QPay</span>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>Төлбөр төлөгдөөгүй байна</div>
            <div className={styles.payText}>
              QPay-ээр {fmt(order.total)} төлж захиалгаа баталгаажуулна уу.
            </div>
          </div>
          <button className="btn btn-primary" style={{ height: 48 }} onClick={onPay}>
            <QrCode size={16} />
            {v.payLabel}
          </button>
        </div>
      )}

      <div className={c.twoCards}>
        <Timeline steps={v.timeline} />
        <div className={`panel ${styles.items}`}>
          <div className="eyebrow">БАРАА</div>
          <ItemRows items={orderItems(order)} />
          <div className={styles.sums}>
            <div className={c.kv}>
              <span>Хүргэлт</span>
              <span>{order.shipping ? fmt(order.shipping) : "Үнэгүй"}</span>
            </div>
            <div className={styles.sumTotal}>
              <span>Нийт</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
          <DeliveryNote order={order} />
        </div>
      </div>

      <KvCard title="ТӨЛБӨРИЙН МЭДЭЭЛЭЛ" rows={v.payRows} />

      <div className={styles.help}>
        Асуух зүйл байвал <b>{STORE_PHONE}</b> · {STORE_EMAIL}
      </div>
    </div>
  );
}
