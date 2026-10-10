import { Check, Loader, Store, Truck, X } from "lucide-react";
import { fmt } from "../../lib/format";
import type { TimelineStep } from "../../lib/orders";
import type { Order } from "../../lib/types";
import c from "./checkout.module.css";
import styles from "./parts.module.css";

export function ItemRows({ items }: { items: { name: string; qty: number; total: number }[] }) {
  return (
    <>
      {items.map((l) => (
        <div key={l.name} className={c.itemRow}>
          <span>
            {l.name} <span className={c.x}>× {l.qty}</span>
          </span>
          <span>{fmt(l.total)}</span>
        </div>
      ))}
    </>
  );
}

export const orderItems = (o: Order) =>
  o.items.map((i) => ({ name: i.name, qty: i.qty, total: i.price * i.qty }));

export function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={c.pill}
      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      <span className={c.pillDot} style={{ background: color }} />
      {label}
    </span>
  );
}

export function DeliveryNote({
  order,
  withContact = false,
}: {
  order: Order;
  withContact?: boolean;
}) {
  const pickup = order.delivery === "pickup";
  const Icon = pickup ? Store : Truck;
  return (
    <div className={c.deliveryNote}>
      <Icon size={16} />
      <div>
        <b>{pickup ? "Очиж авах" : "Хүргэлт"}</b>
        {withContact && ` · ${order.name}, ${order.phone}`}
        <div>{order.address}</div>
      </div>
    </div>
  );
}

export function KvCard({ title, rows, head }: { title?: string; rows: [string, string][]; head?: React.ReactNode }) {
  return (
    <div className={c.kvCard}>
      {head}
      {title && <div className={`eyebrow ${styles.kvTitle}`}>{title}</div>}
      {rows.map(([k, v]) => (
        <div key={k} className={c.kvRow}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

const ICON = { done: Check, failed: X, current: Loader, todo: null };

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="panel">
      <div className="eyebrow" style={{ marginBottom: 16 }}>
        ЗАХИАЛГЫН ЯВЦ
      </div>
      <div className={styles.timeline}>
        {steps.map((t) => (
          <div key={t.label} className={styles.tStep} data-state={t.state}>
            <div className={styles.tRail}>
              <span className={styles.tDot}>
                {(() => {
                  const I = ICON[t.state];
                  return I ? <I size={13} strokeWidth={2.5} /> : null;
                })()}
              </span>
              {!t.last && <span className={styles.tLine} data-done={t.lineDone} />}
            </div>
            <div className={styles.tText}>
              <div className={styles.tLabel}>{t.label}</div>
              {t.sub && <div className={styles.tSub}>{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QPayBadge({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`qpay-logo ${styles[`qp_${size}`]}`}>QPay</span>;
}
