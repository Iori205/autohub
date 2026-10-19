"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  ChartLine,
  Hourglass,
  PackageX,
  Plus,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { OverviewDto } from "@repo/types";
import { useOverview } from "../../../lib/api/stats";
import { useDb } from "../../../lib/db";
import { dotted, money, millions, num, pct, shortDate, signed, ubToday, weekday } from "../../../lib/format";
import { lowStock } from "../../../lib/metrics";
import { STATUS, STATUS_KEYS, payBadge } from "../../../lib/status";
import type { Db } from "../../../lib/types";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Panel, Segmented, Thumb } from "../../ui/bits";
import { openAdjustStock } from "../inventory/adjustStock";
import { RevenueChart } from "./RevenueChart";
import styles from "./Dashboard.module.css";

export function DashboardView() {
  const db = useDb();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const stats = useOverview(range);
  if (!db || !stats) return <PageSkeleton />;
  const today = stats.today || ubToday();
  return (
    <>
      <PageHeader
        title="Хянах самбар"
        sub={`${dotted(today)}, ${weekday(today)} гараг · Сүүлд шинэчилсэн ${new Date().toTimeString().slice(0, 5)}`}
        actions={
          <>
            <Link href="/reports" className="btn">
              <ChartLine size={17} />
              Тайлан
            </Link>
            <Link href="/products/new" className="btn primary">
              <Plus size={17} />
              Бараа нэмэх
            </Link>
          </>
        }
      />
      <Dashboard db={db} stats={stats} range={range} setRange={setRange} />
    </>
  );
}

interface Kpi {
  label: string;
  icon: LucideIcon;
  value: string;
  delta?: number;
  /** a rise is bad (pending, low stock) */
  bad?: boolean;
  note: string;
  sub: string;
}

function Dashboard({
  db,
  stats: o,
  range,
  setRange,
}: {
  db: Db;
  stats: OverviewDto;
  range: 7 | 30 | 90;
  setRange: (r: 7 | 30 | 90) => void;
}) {
  const router = useRouter();
  const low = lowStock(db.products);

  const kpis: Kpi[] = [
    {
      label: "Өнөөдрийн борлуулалт",
      icon: Banknote,
      value: money(o.revenueToday),
      delta: pct(o.revenueToday, o.revenueYesterday),
      note: "өчигдрөөс",
      sub: `${o.paidToday} төлөгдсөн`,
    },
    {
      label: "Захиалга",
      icon: ReceiptText,
      value: num(o.ordersToday),
      delta: pct(o.ordersToday, o.ordersYesterday),
      note: "өчигдрөөс",
      sub: "өнөөдөр",
    },
    {
      label: "Төлбөр хүлээгдэж буй",
      icon: Hourglass,
      value: num(o.pending.count),
      note: `${o.pending.today} нь өнөөдөр`,
      sub: money(o.pending.amount),
    },
    {
      label: "Дуусах дөхсөн бараа",
      icon: PackageX,
      value: num(o.lowStock.count),
      delta: pct(o.lowStock.count, o.lowStock.yesterday),
      bad: true,
      note: "өчигдрөөс",
      sub: `${o.lowStock.out} дууссан`,
    },
  ];

  const counts = o.stageCounts;
  const last7 = Object.values(counts).reduce((a, b) => a + b, 0);
  const cats = o.topCategories.map((c) => ({ name: c.name, value: c.revenue }));
  const byId = new Map(db.products.map((p) => [p.id, p]));
  const top = o.topProducts;

  return (
    <div className="stack">
      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`panel ${styles.kpi}`}>
            <div className={styles.kpiHead}>
              <span>{k.label}</span>
              <k.icon size={18} className="faint" />
            </div>
            <div className={styles.kpiValue}>{k.value}</div>
            <div className={styles.kpiFoot}>
              {k.delta !== undefined && (
                <span
                  className={styles.delta}
                  style={{ color: (k.delta >= 0) !== !!k.bad ? "var(--tone-green)" : "var(--danger)" }}
                >
                  {k.delta >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span>{signed(k.delta)}</span>
                </span>
              )}
              <span className="faint">{k.note}</span>
              <span className={styles.kpiSub}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="row-wrap">
        <RevenueSection stats={o} range={range} setRange={setRange} />
        <Panel title="Захиалга төлөвөөр" sub="Сүүлийн 7 хоног" style={{ flex: "1 1 300px" }}>
          <Donut counts={counts} total={last7} />
        </Panel>
      </div>

      <div className="row-wrap">
        <Panel title="Шилдэг ангилал" sub="Сүүлийн 30 өдөр · орлогоор" style={{ flex: "1 1 380px" }}>
          <div className={styles.cats}>
            {cats.map((c) => (
              <div key={c.name} className={styles.catRow}>
                <span title={c.name} className="muted ellipsis">{c.name}</span>
                <div className={styles.catBar}>
                  <span style={{ width: `${(c.value / cats[0]!.value) * 100}%` }} />
                </div>
                <span className="right" style={{ fontWeight: 500 }}>
                  {millions(c.value)}
                </span>
              </div>
            ))}
            {!cats.length && <div className="empty sm">Сүүлийн 30 өдөрт борлуулалт алга.</div>}
          </div>
        </Panel>
        <Panel
          title="Шилдэг 5 бараа"
          sub="30 өдөр"
          clip
          style={{ flex: "1 1 380px" }}
          action={
            <Link href="/products" className="link-btn">
              Бүгдийг харах
            </Link>
          }
        >
          {top.map((t, i) => (
            <Link key={t.productId} href={`/products/${t.productId}`} className={`tr hover ${styles.topRow}`}>
              <span className="faint mono" style={{ fontSize: 12 }}>
                {i + 1}
              </span>
              <Thumb product={byId.get(t.productId)} categories={db.categories} size={36} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span title={t.name} className="ellipsis" style={{ fontWeight: 500 }}>
                  {t.name}
                </span>
                <span title={`${t.brand} · ${t.oem ?? ""}`} className="muted ellipsis" style={{ fontSize: 11.5 }}>
                  {t.brand} · {t.oem}
                </span>
              </span>
              <span className="right muted">{t.qty} ш</span>
              <span className="right" style={{ fontWeight: 500 }}>
                {money(t.revenue)}
              </span>
            </Link>
          ))}
          {!top.length && <div className="empty sm">Сүүлийн 30 өдөрт борлуулалт алга.</div>}
        </Panel>
      </div>

      <div className="row-wrap">
        <Panel
          title="Сүүлийн захиалгууд"
          clip
          style={{ flex: "2 1 600px" }}
          action={
            <Link href="/orders" className="link-btn">
              Бүх захиалга
            </Link>
          }
        >
          <div className="tbl-scroll">
            <div style={{ minWidth: 600 }}>
              <div className={`tr th ${styles.recentCols}`}>
                <span>Захиалга</span>
                <span>Огноо</span>
                <span>Харилцагч</span>
                <span className="right">Дүн</span>
                <span>Төлбөр</span>
                <span>Төлөв</span>
              </div>
              {db.orders.slice(0, 7).map((o) => (
                <div key={o.id} className={`tr click ${styles.recentCols}`} onClick={() => router.push(`/orders/${o.id}`)}>
                  <Link href={`/orders/${o.id}`} className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>
                    #{o.id}
                  </Link>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {shortDate(o.createdAt)} {o.createdAt.slice(11)}
                  </span>
                  <span title={o.customer.name} className="ellipsis">{o.customer.name}</span>
                  <span className="right" style={{ fontWeight: 500 }}>
                    {money(o.total)}
                  </span>
                  <span>
                    <Badge spec={payBadge(o)} />
                  </span>
                  <span>
                    <Badge spec={STATUS[o.status]} dot />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel
          title="Дуусах дөхсөн бараа"
          clip
          style={{ flex: "1 1 320px" }}
          action={
            <Link href="/inventory" className="link-btn">
              Нөөц рүү
            </Link>
          }
        >
          {low.slice(0, 6).map((p) => {
            const out = p.stock === 0;
            const c = out ? "var(--danger)" : "var(--tone-amber)";
            return (
              <div key={p.id} className={styles.lowRow}>
                <div className={styles.lowMain}>
                  <div className={styles.lowTop}>
                    <span title={p.name} className="ellipsis" style={{ fontWeight: 500 }}>
                      {p.name}
                    </span>
                    <span style={{ fontWeight: 600, color: c, whiteSpace: "nowrap" }}>
                      {out ? "Дууссан" : `${p.stock} / ${p.threshold}`}
                    </span>
                  </div>
                  <div className={styles.lowBottom}>
                    <span title={p.oem[0]} className="mono faint ellipsis">{p.oem[0]}</span>
                    <div className="bar" style={{ height: 4 }}>
                      <span style={{ width: `${Math.max(3, Math.min(100, (p.stock / Math.max(1, p.threshold * 2)) * 100))}%`, background: c }} />
                    </div>
                  </div>
                </div>
                <button className="btn sm ghost" onClick={() => openAdjustStock(db.products, p)}>
                  Нөхөх
                </button>
              </div>
            );
          })}
          {!low.length && <div className="empty sm">Бүх барааны нөөц хангалттай.</div>}
        </Panel>
      </div>
    </div>
  );
}

function RevenueSection({ stats, range, setRange }: { stats: OverviewDto; range: 7 | 30 | 90; setRange: (r: 7 | 30 | 90) => void }) {
  const days = stats.series.map((x) => x.day);
  const data = stats.series.map((x) => x.revenue);
  const total = data.reduce((a, b) => a + b, 0);
  const d = pct(total, stats.previousTotal);
  return (
    <Panel
      style={{ flex: "2 1 560px" }}
      title={
        <span className={styles.revTitle}>
          Орлого
          <strong>{money(total)}</strong>
          <em style={{ color: d >= 0 ? "var(--tone-green)" : "var(--danger)" }}>{signed(d)}</em>
          <span className="faint">өмнөх үеэс</span>
        </span>
      }
      action={
        <Segmented
          options={[
            [7, "7 өдөр"],
            [30, "30 өдөр"],
            [90, "90 өдөр"],
          ]}
          value={range}
          onChange={setRange}
        />
      }
    >
      <RevenueChart days={days} values={data} />
    </Panel>
  );
}

function Donut({ counts, total }: { counts: Partial<Record<string, number>>; total: number }) {
  const C = 2 * Math.PI * 54;
  let cum = 0;
  const segs = STATUS_KEYS.flatMap((k) => {
    const n = counts[k] ?? 0;
    if (!n) return [];
    const len = (n / total) * C;
    const s = { k, dash: `${Math.max(0, len - 1.5).toFixed(2)} ${C.toFixed(2)}`, off: (-cum).toFixed(2) };
    cum += len;
    return [s];
  });
  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut}>
        <svg viewBox="0 0 140 140" aria-hidden>
          <circle cx="70" cy="70" r="54" fill="none" strokeWidth="16" style={{ stroke: "var(--divider)" }} />
          {segs.map((s) => (
            <circle
              key={s.k}
              cx="70"
              cy="70"
              r="54"
              fill="none"
              strokeWidth="16"
              strokeDasharray={s.dash}
              strokeDashoffset={s.off}
              className={`tone-${STATUS[s.k].tone}`}
              style={{ stroke: "var(--tc)" }}
            />
          ))}
        </svg>
        <div className={styles.donutCenter}>
          <span>{total}</span>
          <span>захиалга</span>
        </div>
      </div>
      <div className={styles.legend}>
        {STATUS_KEYS.map((k) => {
          const n = counts[k] ?? 0;
          return (
            <div key={k} className={`${styles.legendRow} tone-${STATUS[k].tone}`}>
              <span className={styles.legendDot} />
              <span className="muted" style={{ flex: 1 }}>
                {STATUS[k].label}
              </span>
              <span style={{ fontWeight: 600 }}>{n}</span>
              <span className={styles.legendPct}>{total ? Math.round((n / total) * 100) : 0}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
