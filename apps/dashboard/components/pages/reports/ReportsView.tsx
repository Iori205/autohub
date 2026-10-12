"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { downloadCsv } from "../../../lib/csv";
import { useDb } from "../../../lib/db";
import { money, num } from "../../../lib/format";
import { inRange, report, revenueSplit, type Period, type SplitRow } from "../../../lib/metrics";
import type { Db } from "../../../lib/types";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Panel, Segmented } from "../../ui/bits";
import styles from "./Reports.module.css";

const RANGE_TEXT: Record<Period, string> = {
  day: "Сүүлийн 14 өдөр",
  week: "Сүүлийн 12 долоо хоног",
  month: "Сүүлийн 6 сар",
};

export function ReportsView() {
  const db = useDb();
  const [period, setPeriod] = useState<Period>("month");
  if (!db) return <PageSkeleton />;
  return <Reports db={db} period={period} setPeriod={setPeriod} />;
}

function Reports({ db, period, setPeriod }: { db: Db; period: Period; setPeriod: (p: Period) => void }) {
  const rows = report(db.orders, period);
  const from = rows[0]!.from;
  const to = rows[rows.length - 1]!.to;
  const inPeriod = db.orders.filter((o) => inRange(o, from, to));
  const total = rows.reduce((a, r) => a + r.revenue, 0);
  const orders = rows.reduce((a, r) => a + r.orders, 0);
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  const byCat = revenueSplit(inPeriod, db.products, db.categories, "category");
  const byBrand = revenueSplit(inPeriod, db.products, db.categories, "brand");
  const topCat = byCat.find((r) => r.name !== "Хүргэлтийн төлбөр");

  const exportAll = () =>
    downloadCsv(`autohub-report-${period}.csv`, [
      ["Хугацаа", "Захиалга", "Орлого", "Дундаж"],
      ...rows.map((r) => [r.label, r.orders, r.revenue, r.orders ? Math.round(r.revenue / r.orders) : 0]),
    ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Тайлан" }]}
        title="Тайлан"
        sub="Борлуулалт хугацаа, ангилал, брэндээр"
        actions={
          <button className="btn primary" onClick={exportAll}>
            <Download size={17} />
            Экспорт (CSV)
          </button>
        }
      />
      <div className="stack">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <Segmented
            className="on-panel lg"
            options={[
              ["day", "Өдрөөр"],
              ["week", "7 хоногоор"],
              ["month", "Сараар"],
            ]}
            value={period}
            onChange={setPeriod}
          />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {RANGE_TEXT[period]}
          </span>
        </div>
        <div className="kpis">
          {[
            ["Нийт орлого", money(total)],
            ["Захиалга", num(orders)],
            ["Дундаж захиалга", orders ? money(total / orders) : "—"],
            ["Шилдэг ангилал", topCat?.name ?? "—"],
          ].map(([l, v]) => (
            <div key={l} className="panel stat">
              <span>{l}</span>
              <strong title={v} className="ellipsis">{v}</strong>
            </div>
          ))}
        </div>
        <Panel title="Борлуулалт хугацаагаар" sub="Төлөгдсөн захиалгын дүн (хүргэлт орсон)">
          <div className="tbl-scroll">
            <div className={styles.bars} style={{ minWidth: rows.length * 44 }}>
              {rows.map((r, i) => (
                <div key={r.from} className={styles.barCol} title={`${r.label}: ${money(r.revenue)}`}>
                  <span className={styles.barVal}>{(r.revenue / 1e6).toFixed(1)}</span>
                  <div
                    className={styles.bar}
                    style={{ height: `${(r.revenue / max) * 82}%`, background: i === rows.length - 1 ? "var(--accent)" : "var(--accent-muted)" }}
                  />
                  <span className={styles.barLabel}>{r.short}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <div className={`tr th ${styles.cols}`}>
              <span>Хугацаа</span>
              <span className="right">Захиалга</span>
              <span className="right">Орлого</span>
              <span className="right">Дундаж</span>
            </div>
            {[...rows].reverse().map((r) => (
              <div key={r.from} className={`tr ${styles.cols}`} style={{ paddingTop: 7, paddingBottom: 7 }}>
                <span>{r.label}</span>
                <span className="right">{r.orders}</span>
                <span className="right strong">{money(r.revenue)}</span>
                <span className="right muted">{r.orders ? money(r.revenue / r.orders) : "—"}</span>
              </div>
            ))}
            <div className={`tr ${styles.cols}`} style={{ borderBottom: "none", fontWeight: 600 }}>
              <span>Нийт</span>
              <span className="right">{orders}</span>
              <span className="right">{money(total)}</span>
              <span className="right muted">{orders ? money(total / orders) : "—"}</span>
            </div>
          </div>
        </Panel>
        <div className="row-wrap">
          <Split title="Ангилалаар" rows={byCat} file="autohub-by-category.csv" head="Ангилал" />
          <Split title="Брэндээр" rows={byBrand} file="autohub-by-brand.csv" head="Брэнд" />
        </div>
      </div>
    </>
  );
}

function Split({ title, rows, file, head }: { title: string; rows: SplitRow[]; file: string; head: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Panel
      title={title}
      clip
      style={{ flex: "1 1 420px" }}
      action={
        <button
          className="link-btn"
          onClick={() => downloadCsv(file, [[head, "Орлого", "Хувь"], ...rows.map((r) => [r.name, r.value, `${Math.round(r.share * 100)}%`])])}
        >
          <Download size={14} />
          CSV
        </button>
      }
    >
      {rows.map((r) => (
        <div key={r.name} className={`tr ${styles.splitCols}`}>
          <span title={r.name} className="ellipsis" style={{ fontWeight: 500, color: r.name === "Хүргэлтийн төлбөр" ? "var(--muted)" : undefined }}>
            {r.name}
          </span>
          <div className="bar">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="right muted" style={{ fontSize: 12 }}>
            {Math.round(r.share * 100)}%
          </span>
          <span className="right strong">{money(r.value)}</span>
        </div>
      ))}
      {!rows.length && <div className="empty sm">Энэ хугацаанд борлуулалт алга.</div>}
    </Panel>
  );
}
