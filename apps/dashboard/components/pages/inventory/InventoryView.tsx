"use client";

import Link from "next/link";
import { Download, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { setThreshold } from "../../../lib/api/products";
import { downloadCsv } from "../../../lib/csv";
import { useDb } from "../../../lib/db";
import { money, num, shortDateTime } from "../../../lib/format";
import { STOCK_BADGE, STOCK_COLOR, stockLevel, type StockLevel } from "../../../lib/status";
import type { Db } from "../../../lib/types";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, SearchInput, Segmented, Thumb } from "../../ui/bits";
import { openAdjustStock } from "./adjustStock";
import styles from "./Inventory.module.css";

export function InventoryView() {
  const db = useDb();
  if (!db) return <PageSkeleton />;
  return <Inventory db={db} />;
}

function Inventory({ db }: { db: Db }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockLevel | "all">("all");
  const q = search.trim().toLowerCase();
  const low = db.products.filter((p) => stockLevel(p) === "low").length;
  const out = db.products.filter((p) => stockLevel(p) === "out").length;
  const list = db.products
    .filter((p) => (filter === "all" || stockLevel(p) === filter) && (!q || p.name.toLowerCase().includes(q) || p.oem.some((o) => o.toLowerCase().includes(q))))
    .sort((a, b) => a.stock / Math.max(1, a.threshold) - b.stock / Math.max(1, b.threshold));
  const name = new Map(db.products.map((p) => [p.id, p.name]));

  const stats = [
    { l: "Нийт нөөц", v: `${num(db.products.reduce((a, p) => a + p.stock, 0))} ш`, c: "var(--text)" },
    { l: "Нөөцийн үнэлгээ", v: money(db.products.reduce((a, p) => a + p.stock * p.price, 0)), c: "var(--text)" },
    { l: "Дуусах дөхсөн", v: `${low} бараа`, c: "var(--tone-amber)" },
    { l: "Дууссан", v: `${out} бараа`, c: "var(--danger)" },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Нөөц" }]}
        title="Нөөц"
        sub="Нөөцийн түвшин, доод хязгаар болон хөдөлгөөний түүх"
        actions={
          <>
            <button
              className="btn"
              onClick={() =>
                downloadCsv("autohub-stock-log.csv", [
                  ["Огноо", "Бараа", "Өөрчлөлт", "Шалтгаан", "Хэрэглэгч", "Үлдэгдэл"],
                  ...db.stockLog.map((l) => [l.at, name.get(l.productId), l.delta, l.reason, l.by, l.after]),
                ])
              }
            >
              <Download size={17} />
              Түүх экспорт
            </button>
            <button className="btn primary" onClick={() => openAdjustStock(db.products)}>
              <SlidersHorizontal size={17} />
              Нөөц тохируулах
            </button>
          </>
        }
      />
      <div className="stack">
        <div className="kpis">
          {stats.map((s) => (
            <div key={s.l} className="panel stat">
              <span>{s.l}</span>
              <strong style={{ color: s.c }}>{s.v}</strong>
            </div>
          ))}
        </div>
        <div className="panel clip">
          <div className="toolbar">
            <h3 style={{ fontSize: 13.5, fontWeight: 600, marginRight: 8 }}>Нөөцийн түвшин</h3>
            <SearchInput value={search} onChange={setSearch} placeholder="Бараа эсвэл OEM" />
            <Segmented
              options={[
                ["all", "Бүгд"],
                ["low", `Бага (${low})`],
                ["out", `Дууссан (${out})`],
                ["ok", "Хангалттай"],
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className="tbl-scroll">
            <div className={styles.table}>
              <div className={`tr th ${styles.cols}`}>
                <span>Бараа</span>
                <span>OEM</span>
                <span className="right">Нөөц</span>
                <span>Доод хязгаар</span>
                <span>Төлөв</span>
                <span className="right hide-narrow">Үнийн дүн</span>
                <span />
              </div>
              {list.map((p) => {
                const lv = stockLevel(p);
                return (
                  <div key={p.id} className={`tr hover ${styles.cols}`}>
                    <Link href={`/products/${p.id}`} className={styles.prod}>
                      <Thumb product={p} categories={db.categories} size={32} />
                      <span title={p.name} className="ellipsis">{p.name}</span>
                    </Link>
                    <span title={p.oem.join(", ")} className="mono muted ellipsis" style={{ fontSize: 12 }}>
                      {p.oem[0]}
                    </span>
                    <span className="right strong" style={{ fontSize: 14, color: STOCK_COLOR[lv] }}>
                      {p.stock}
                    </span>
                    <input
                      key={p.threshold}
                      className="input"
                      type="number"
                      min={0}
                      style={{ width: 72, height: 28 }}
                      defaultValue={p.threshold}
                      aria-label="Доод хязгаар"
                      onBlur={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        if (v !== p.threshold) void setThreshold(p.id, v);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />
                    <span>
                      <Badge spec={STOCK_BADGE[lv]} dot />
                    </span>
                    <span className="right muted hide-narrow">{money(p.stock * p.price)}</span>
                    <button className="btn sm ghost" style={{ justifySelf: "end", height: 28 }} onClick={() => openAdjustStock(db.products, p)}>
                      <SlidersHorizontal size={14} />
                      Тохируулах
                    </button>
                  </div>
                );
              })}
              {!list.length && <div className="empty sm">Энэ ангилалд бараа алга.</div>}
            </div>
          </div>
        </div>
        <div className="panel clip">
          <div className="panel-head">
            <h3>Нөөцийн хөдөлгөөний түүх</h3>
          </div>
          <div className="tbl-scroll">
            <div style={{ minWidth: 840 }}>
              <div className={`tr th ${styles.logCols}`}>
                <span>Огноо</span>
                <span>Бараа</span>
                <span className="right">Өөрчлөлт</span>
                <span>Шалтгаан</span>
                <span>Хэрэглэгч</span>
                <span className="right">Үлдэгдэл</span>
              </div>
              {db.stockLog.slice(0, 40).map((l) => (
                <div key={l.id} className={`tr ${styles.logCols}`}>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {shortDateTime(l.at)}
                  </span>
                  <span title={name.get(l.productId)} className="ellipsis" style={{ fontWeight: 500 }}>
                    {name.get(l.productId) ?? "—"}
                  </span>
                  <span className="right mono strong" style={{ color: l.delta > 0 ? "var(--tone-green)" : "var(--danger)" }}>
                    {l.delta > 0 ? "+" : "−"}
                    {Math.abs(l.delta)}
                  </span>
                  <span title={l.reason} className="muted ellipsis">
                    {l.reason.includes("#") ? (
                      <>
                        {l.reason.split("#")[0]}
                        <Link href={`/orders/${l.reason.split("#")[1]}`}>#{l.reason.split("#")[1]}</Link>
                      </>
                    ) : (
                      l.reason
                    )}
                  </span>
                  <span title={l.by} className="ellipsis">{l.by}</span>
                  <span className="right" style={{ fontWeight: 500 }}>
                    {l.after}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
