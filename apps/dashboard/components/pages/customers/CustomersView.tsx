"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarFront, Download, Mail, MapPin, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadCsv } from "../../../lib/csv";
import { useDb } from "../../../lib/db";
import { digits, dotted, initials, money, shortDate } from "../../../lib/format";
import { customerStats, type CustomerStats } from "../../../lib/metrics";
import { STATUS } from "../../../lib/status";
import type { Customer, Db } from "../../../lib/types";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, SearchInput } from "../../ui/bits";
import styles from "./Customers.module.css";

export function CustomersView({ openId }: { openId?: string }) {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Customers db={db} openId={openId} />;
}

const EMPTY: CustomerStats = { orders: [], live: 0, spent: 0, last: null };

function Customers({ db, openId }: { db: Db; openId?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const stats = customerStats(db.orders);
  const q = search.trim().toLowerCase();
  const rows = db.customers
    .map((c) => ({ c, s: stats.get(c.id) ?? EMPTY }))
    .filter(
      ({ c }) =>
        !q ||
        `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q) ||
        (digits(q).length >= 3 && digits(c.phone).includes(digits(q))),
    )
    .sort((a, b) => b.s.spent - a.s.spent);
  const open = openId ? db.customers.find((c) => c.id === openId) : undefined;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Хэрэглэгчид" }]}
        title="Хэрэглэгчид"
        sub={`${db.customers.length} бүртгэлтэй хэрэглэгч`}
        actions={
          <button
            className="btn primary"
            onClick={() =>
              downloadCsv("autohub-customers.csv", [
                ["Нэр", "Утас", "И-мэйл", "Бүртгүүлсэн", "Захиалга", "Нийт зарцуулалт"],
                ...rows.map(({ c, s }) => [c.name, c.phone, c.email, c.registeredAt, s.orders.length, s.spent]),
              ])
            }
          >
            <Download size={17} />
            CSV экспорт
          </button>
        }
      />
      <div className="panel clip">
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Нэр, утас, и-мэйл" />
          <span className="count">{rows.length} хэрэглэгч</span>
        </div>
        <div className="tbl-scroll">
          <div className={styles.table}>
            <div className={`tr th ${styles.cols}`}>
              <span>Хэрэглэгч</span>
              <span>Утас</span>
              <span>Машин</span>
              <span className="right">Захиалга</span>
              <span className="right">Нийт зарцуулалт</span>
              <span>Сүүлд</span>
              <span className="hide-narrow">Бүртгүүлсэн</span>
            </div>
            {rows.map(({ c, s }) => (
              <div key={c.id} className={`tr click ${styles.cols}`} onClick={() => router.push(`/customers?c=${c.id}`, { scroll: false })}>
                <div className={styles.who}>
                  <span className="avatar">{initials(c.name)}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span title={c.name} className="ellipsis" style={{ fontWeight: 500 }}>
                      {c.name}
                    </span>
                    <span title={c.email} className="faint ellipsis" style={{ fontSize: 11.5 }}>
                      {c.email}
                    </span>
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 12 }}>
                  {c.phone}
                </span>
                <span title={c.cars.map((x) => `${x.make} ${x.model} ${x.year}`).join(", ") || undefined} className="muted ellipsis">
                  {c.cars.length ? `${c.cars[0]!.make} ${c.cars[0]!.model} ${c.cars[0]!.year}${c.cars.length > 1 ? ` +${c.cars.length - 1}` : ""}` : "—"}
                </span>
                <span className="right strong">{s.orders.length}</span>
                <span className="right strong">{money(s.spent)}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {s.last ? shortDate(s.last) : "—"}
                </span>
                <span className="muted hide-narrow" style={{ fontSize: 12 }}>
                  {dotted(c.registeredAt)}
                </span>
              </div>
            ))}
            {!rows.length && <div className="empty sm">Хэрэглэгч олдсонгүй.</div>}
          </div>
        </div>
      </div>
      {open && <CustomerDrawer c={open} s={stats.get(open.id) ?? EMPTY} onClose={() => router.replace("/customers", { scroll: false })} />}
    </>
  );
}

function CustomerDrawer({ c, s, onClose }: { c: Customer; s: CustomerStats; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const orders = [...s.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={c.name}>
        <div className={styles.dHead}>
          <span className="avatar" style={{ width: 42, height: 42, fontSize: 13 }}>
            {initials(c.name)}
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: 15 }}>{c.name}</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              Бүртгүүлсэн {dotted(c.registeredAt)}
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Хаах">
            <X size={19} />
          </button>
        </div>
        <div className={styles.dBody}>
          <div className={styles.dStats}>
            {[
              ["Захиалга", String(s.orders.length)],
              ["Нийт", money(s.spent)],
              ["Дундаж", s.live ? money(s.spent / s.live) : "—"],
            ].map(([l, v]) => (
              <div key={l}>
                <span>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className={styles.dContacts}>
            <div>
              <Phone size={16} />
              <span className="mono">{c.phone}</span>
            </div>
            <div>
              <Mail size={16} />
              {c.email}
            </div>
            <div style={{ alignItems: "flex-start" }}>
              <MapPin size={16} />
              {c.address}
            </div>
          </div>
          <div className={styles.dSection}>
            <h3>Хадгалсан машин</h3>
            {c.cars.map((car, i) => (
              <div key={i} className={styles.car}>
                <CarFront size={20} style={{ color: "var(--accent)" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 500 }}>
                    {car.make} {car.model} {car.year}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {car.engine}
                  </span>
                </div>
              </div>
            ))}
            {!c.cars.length && <span className="faint">Машин хадгалаагүй</span>}
          </div>
          <div className={styles.dSection}>
            <h3>Захиалгууд</h3>
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className={styles.order}>
                <span className="mono" style={{ fontWeight: 500 }}>
                  #{o.id}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {shortDate(o.createdAt)}
                </span>
                <span>
                  <Badge spec={STATUS[o.status]} />
                </span>
                <span className="right strong">{money(o.total)}</span>
              </Link>
            ))}
            {!orders.length && <span className="faint">Захиалга хийгээгүй</span>}
          </div>
        </div>
      </aside>
    </>
  );
}
