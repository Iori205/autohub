import { dotted, money } from "../../../lib/format";
import { DELIVERY, payBadge } from "../../../lib/status";
import type { Customer, Order, Product, Settings } from "../../../lib/types";
import styles from "./Orders.module.css";

/** Packing slip — printed on white paper regardless of theme. */
export function Slip({
  order: o,
  customer: c,
  products,
  store,
}: {
  order: Order;
  customer?: Customer;
  products: Product[];
  store: Settings["store"];
}) {
  const car = c?.cars[0];
  return (
    <div className={styles.slip}>
      <div className={styles.slipHead}>
        <div>
          <div className={styles.slipStore}>{store.name}</div>
          <div className={styles.slipMuted}>
            {store.phone} · {store.address}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className={styles.slipNo}>#{o.id}</div>
          <div className={styles.slipMuted}>{dotted(o.createdAt)}</div>
        </div>
      </div>
      <div className={styles.slipParties}>
        <div>
          <div className={styles.slipLabel}>ХҮЛЭЭН АВАГЧ</div>
          <div style={{ fontWeight: 600 }}>{c?.name}</div>
          <div>{c?.phone}</div>
          <div>{o.address}</div>
        </div>
        <div>
          <div className={styles.slipLabel}>ХҮРГЭЛТ / МАШИН</div>
          <div style={{ fontWeight: 600 }}>{DELIVERY[o.delivery]}</div>
          <div>{car ? `${car.make} ${car.model} ${car.year}` : "—"}</div>
        </div>
      </div>
      {o.items.map((it) => {
        const p = products.find((x) => x.id === it.productId);
        return (
          <div key={it.productId} className={styles.slipItem}>
            <span className={styles.slipBox} />
            <span>{it.name}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{p?.oem[0] ?? ""}</span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>× {it.qty}</span>
          </div>
        );
      })}
      <div className={styles.slipTotal}>
        <span>Нийт · QPay {payBadge(o).label.toLowerCase()}</span>
        <span>{money(o.total)}</span>
      </div>
    </div>
  );
}
