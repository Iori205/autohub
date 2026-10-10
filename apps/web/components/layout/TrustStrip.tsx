import { Headset, ShieldCheck, Store, Truck } from "lucide-react";
import styles from "./TrustStrip.module.css";

const ITEMS = [
  { icon: Store, t: "Ирж авах үнэгүй", s: "Салбараас өөрөө ирж авбал төлбөргүй" },
  { icon: ShieldCheck, t: "Баталгаат сэлбэг", s: "Оригинал, аналог бүх бараанд баталгаа" },
  { icon: Truck, t: "Хүргэлт", s: "Улаанбаатарт 24 цагийн дотор" },
  { icon: Headset, t: "Онлайн зөвлөгөө", s: "VIN-ээр тохирохыг шалгаж өгнө" },
];

export function TrustStrip() {
  return (
    <section className={`container ${styles.wrap}`}>
      <div className={styles.grid}>
        {ITEMS.map(({ icon: Icon, t, s }) => (
          <div key={t} className={styles.item}>
            <span className={styles.icon}>
              <Icon size={22} />
            </span>
            <div>
              <div className={styles.t}>{t}</div>
              <div className={styles.s}>{s}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
