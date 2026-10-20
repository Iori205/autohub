"use client";

import { useState } from "react";
import { money, shortDate, weekday } from "../../../lib/format";
import styles from "./Dashboard.module.css";

const W = 600;
const H = 200;

/** Өдрийн орлогын талбайн график; хулгана аваачихад утгыг харуулна. */
export function RevenueChart({ days, values }: { days: string[]; values: number[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const n = values.length;
  const max = Math.max(5e5, Math.ceil((Math.max(...values) * 1.12) / 5e5) * 5e5);
  const pts = values.map((v, i) => [(i / Math.max(1, n - 1)) * W, H - (v / max) * H] as const);
  const line = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  const h = hi !== null && hi < n ? hi : null;

  return (
    <div className={styles.chartPad}>
      <div
        className={styles.chart}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHi(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
        }}
        onPointerLeave={() => setHi(null)}
      >
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className={styles.grid} style={{ top: `${100 - k * 25}%` }}>
            <span>{((max * k) / 4 / 1e6).toFixed(1)} сая</span>
          </div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.svg} aria-hidden>
          <defs>
            <linearGradient id="revg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.26" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line}L${W},${H}L0,${H}Z`} fill="url(#revg)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {h !== null && (
          <>
            <div className={styles.cursor} style={{ left: `${(h / (n - 1)) * 100}%` }} />
            <div
              className={styles.point}
              style={{ left: `${(h / (n - 1)) * 100}%`, top: `${(pts[h]![1] / H) * 100}%` }}
            />
            <div
              className={styles.tip}
              style={{
                left: `${(h / (n - 1)) * 100}%`,
                transform: h / (n - 1) > 0.7 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
              }}
            >
              <div>
                {shortDate(days[h]!)} · {weekday(days[h]!)}
              </div>
              <strong>{money(values[h]!)}</strong>
            </div>
          </>
        )}
        <div className={styles.xAxis}>
          {[0, 1, 2, 3, 4, 5].map((j) => {
            const i = Math.round((j * (n - 1)) / 5);
            return (
              <span key={j} style={{ left: `${(i / (n - 1)) * 100}%` }}>
                {shortDate(days[i]!)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
