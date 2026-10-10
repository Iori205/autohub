"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Receipt, Store } from "lucide-react";
import { useOrder } from "../../lib/api/orders";
import { fmt } from "../../lib/format";
import { useNow } from "../../lib/hooks";
import { orderView } from "../../lib/orders";
import { shopHref } from "../../lib/site";
import { CheckoutSteps } from "./CheckoutSteps";
import { OrderMissing } from "./PaymentView";
import { DeliveryNote, ItemRows, KvCard, StatusPill, Timeline, orderItems } from "./parts";
import c from "./checkout.module.css";
import styles from "./SuccessView.module.css";

function SuccessMark() {
  return (
    <span className={styles.mark}>
      <svg width={68} height={68} viewBox="0 0 64 64">
        <circle className={styles.circle} cx={32} cy={32} r={28} />
        <path className={styles.check} d="M20 33 l8 8 l16 -17" />
      </svg>
    </span>
  );
}

export function SuccessView({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const order = useOrder(orderNo);
  const now = useNow(5000);
  const unpaid = !!order && order.payStatus !== "paid";

  // Only paid orders belong here; anything else goes back to the payment step.
  useEffect(() => {
    if (unpaid) router.replace(`/checkout/payment?order=${orderNo}`);
  }, [unpaid, orderNo, router]);

  if (order === undefined) return <main className={`container ${c.page}`} />;
  if (order === null) return <OrderMissing step={4} />;
  if (unpaid) return <main className={`container ${c.page}`} />;

  const v = orderView(order, now);

  return (
    <main className={`container ${c.page}`}>
      <CheckoutSteps step={4} />
      <div className={styles.wrap}>
        <div className={styles.hero}>
          <SuccessMark />
          <h1 className={styles.title}>Төлбөр амжилттай төлөгдлөө</h1>
          <div className={styles.meta}>
            <span className="mono" style={{ fontSize: 15 }}>
              Захиалга #{order.no}
            </span>
            <StatusPill label={v.statusLabel} color={v.statusColor} />
          </div>
          <p className={styles.lede}>
            Баталгаажуулах SMS <b>{order.phone}</b> дугаарт илгээгдлээ. Захиалгыг тань
            одоо бэлтгэж эхэлнэ.
          </p>
        </div>

        <KvCard
          rows={v.payRows}
          head={
            <div className={styles.paidHead}>
              <span className="eyebrow">ТӨЛСӨН ДҮН</span>
              <span className={styles.paid}>{fmt(order.total)}</span>
            </div>
          }
        />

        <div className={c.twoCards}>
          <Timeline steps={v.timeline} />
          <div className={`panel ${styles.items}`}>
            <div className="eyebrow">БАРАА</div>
            <ItemRows items={orderItems(order)} />
            <div className={`${c.kv} ${styles.shipRow}`}>
              <span>Хүргэлт</span>
              <span>{order.shipping ? fmt(order.shipping) : "Үнэгүй"}</span>
            </div>
            <DeliveryNote order={order} />
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/account/orders?order=${order.no}`} className="btn btn-primary btn-lg">
            <Receipt size={17} />
            Захиалга харах
          </Link>
          <Link href={shopHref()} className="btn btn-lg">
            <Store size={17} />
            Дэлгүүр рүү буцах
          </Link>
        </div>
      </div>
    </main>
  );
}
