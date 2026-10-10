import Link from "next/link";
import styles from "./CheckoutSteps.module.css";

const STEPS = [
  { label: "Сагс", href: "/cart" },
  { label: "Захиалгын мэдээлэл", href: "/checkout" },
  { label: "Төлбөр төлөх", href: null },
  { label: "Амжилттай", href: null },
];

/** 1 Сагс · 2 Мэдээлэл · 3 Төлбөр · 4 Амжилттай. Back-navigation only before an order exists. */
export function CheckoutSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className={styles.steps}>
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < step;
        const state = done ? "done" : n === step ? "active" : "todo";
        const inner = (
          <>
            <span className={styles.bar} />
            <span className={styles.label}>
              <span className={styles.num}>{done ? "✓" : n}</span>
              <span className="not-mobile">{s.label}</span>
            </span>
          </>
        );
        return done && step <= 2 && s.href ? (
          <Link key={n} href={s.href} className={styles.step} data-state={state}>
            {inner}
          </Link>
        ) : (
          <div key={n} className={styles.step} data-state={state}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
