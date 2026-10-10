"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Download, Printer, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { setOrderStatus } from "../../../lib/api/orders";
import { useDb } from "../../../lib/db";
import { digits, money, shortDate } from "../../../lib/format";
import { customerById, toProcess } from "../../../lib/metrics";
import { DELIVERY, PAY_LABELS, STATUS, STATUS_KEYS, payBadge } from "../../../lib/status";
import type { Db, DeliveryKind, Order, OrderStatus } from "../../../lib/types";
import { confirmAction, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Empty, SearchInput } from "../../ui/bits";
import { changeStatus, exportOrders } from "./actions";
import { Slip } from "./Slip";
import styles from "./Orders.module.css";

const PER_PAGE = 20;

export function OrdersView() {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Orders db={db} />;
}

function Orders({ db }: { db: Db }) {
  const router = useRouter();
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pay, setPay] = useState("all");
  const [deliv, setDeliv] = useState<DeliveryKind | "all">("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [printing, setPrinting] = useState<Order[]>([]);

  const cust = useMemo(() => customerById(db.customers), [db.customers]);
  const q = search.trim().toLowerCase();
  const qd = q.replace(/[-\s#]/g, "");
  const filtered = db.orders.filter((o) => {
    const c = cust.get(o.customerId);
    return (
      (tab === "all" || o.status === tab) &&
      (!q || o.id.toLowerCase().includes(qd) || !!c?.name.toLowerCase().includes(q) || (!!qd && digits(c?.phone ?? "").includes(qd))) &&
      (pay === "all" || payBadge(o).label === pay) &&
      (deliv === "all" || o.delivery === deliv) &&
      (!from || o.createdAt.slice(0, 10) >= from) &&
      (!to || o.createdAt.slice(0, 10) <= to)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const allSel = slice.length > 0 && slice.every((o) => sel.has(o.id));
  const isFiltered = !!(search || from || to || pay !== "all" || deliv !== "all" || tab !== "all");
  const selected = db.orders.filter((o) => sel.has(o.id));

  const reset = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setPay("all");
    setDeliv("all");
    setTab("all");
    setPage(1);
  };
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulkStatus = (v: string) => {
    if (!v) return;
    const st = v as OrderStatus;
    const ids = [...sel];
    const run = async () => {
      await setOrderStatus(ids, st);
      setSel(new Set());
      toast(`${ids.length} захиалга → ${STATUS[st].label}`, "ok");
    };
    if (st === "cancelled")
      confirmAction({
        title: `${ids.length} захиалга цуцлах уу?`,
        msg: "Төлөгдсөн захиалгын төлбөр буцаан олгогдоно. Энэ үйлдлийг буцаах боломжгүй.",
        ok: "Цуцлах",
        danger: true,
        onOk: run,
      });
    else void run();
  };

  const bulkPrint = () => {
    setPrinting(selected);
    toast(`${selected.length} баглаа баримт хэвлэхэд бэлэн`, "info");
    setTimeout(() => window.print(), 300);
  };

  const paidCount = toProcess(db.orders).length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Захиалгууд" }]}
        title="Захиалгууд"
        sub={`Нийт ${db.orders.length} захиалга · ${paidCount} шинэ төлөгдсөн захиалга боловсруулах шаардлагатай`}
        actions={
          <button className="btn primary" onClick={() => exportOrders(filtered, db.customers)}>
            <Download size={17} />
            CSV экспорт
          </button>
        }
      />
      <div className="panel clip">
        <div className={styles.tabs} role="tablist">
          {(["all", ...STATUS_KEYS] as const).map((k) => {
            const n = k === "all" ? db.orders.length : db.orders.filter((o) => o.status === k).length;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                className={styles.tab}
                onClick={() => {
                  setTab(k);
                  setPage(1);
                  setSel(new Set());
                }}
              >
                {k === "all" ? "Бүгд" : STATUS[k].label}
                <span className="count-chip">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar">
          <SearchInput value={search} onChange={filter(setSearch)} placeholder="Захиалга #, нэр, утас" />
          <div className={styles.dates}>
            <Calendar size={16} className="faint" />
            <input type="date" value={from} onChange={(e) => filter(setFrom)(e.target.value)} aria-label="Эхлэх огноо" />
            <span className="faint">–</span>
            <input type="date" value={to} onChange={(e) => filter(setTo)(e.target.value)} aria-label="Дуусах огноо" />
          </div>
          <select className="select" value={pay} onChange={(e) => filter(setPay)(e.target.value)} aria-label="Төлбөр">
            <option value="all">Төлбөр: Бүгд</option>
            {PAY_LABELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            className="select"
            value={deliv}
            onChange={(e) => filter(setDeliv)(e.target.value as DeliveryKind | "all")}
            aria-label="Хүргэлт"
          >
            <option value="all">Хүргэлт: Бүгд</option>
            {(Object.keys(DELIVERY) as DeliveryKind[]).map((k) => (
              <option key={k} value={k}>
                {DELIVERY[k]}
              </option>
            ))}
          </select>
          {isFiltered && (
            <button className="btn plain md" onClick={reset}>
              <X size={15} />
              Шүүлтүүр арилгах
            </button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="bulkbar">
            <strong>{sel.size} захиалга сонгосон</strong>
            <select className="select" style={{ height: 30, background: "var(--panel)" }} value="" onChange={(e) => bulkStatus(e.target.value)} aria-label="Төлөв өөрчлөх">
              <option value="">Төлөв өөрчлөх…</option>
              {STATUS_KEYS.map((k) => (
                <option key={k} value={k}>
                  {STATUS[k].label}
                </option>
              ))}
            </select>
            <button className="btn sm" onClick={bulkPrint}>
              <Printer size={15} />
              Баглаа хэвлэх
            </button>
            <button className="btn sm" onClick={() => exportOrders(selected, db.customers)}>
              <Download size={15} />
              CSV
            </button>
            <button className="btn plain sm end" onClick={() => setSel(new Set())}>
              Болих
            </button>
          </div>
        )}
        <div className="tbl-scroll">
          <div style={{ minWidth: 1100 }}>
            <div className={`tr th ${styles.cols}`}>
              <input
                type="checkbox"
                checked={allSel}
                aria-label="Бүгдийг сонгох"
                onChange={() =>
                  setSel((s) => {
                    const n = new Set(s);
                    slice.forEach((o) => (allSel ? n.delete(o.id) : n.add(o.id)));
                    return n;
                  })
                }
              />
              <span>Захиалга #</span>
              <span>Огноо</span>
              <span>Харилцагч</span>
              <span>Утас</span>
              <span className="right">Дүн</span>
              <span>Төлбөр</span>
              <span>Хүргэлт</span>
              <span>Төлөв</span>
            </div>
            {slice.map((o) => {
              const c = cust.get(o.customerId);
              const st = STATUS[o.status];
              return (
                <div
                  key={o.id}
                  className={`tr click ${styles.cols}`}
                  data-selected={sel.has(o.id)}
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <input
                    type="checkbox"
                    checked={sel.has(o.id)}
                    aria-label={`#${o.id} сонгох`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(o.id)}
                  />
                  <Link href={`/orders/${o.id}`} className={`mono ${styles.idLink}`} onClick={(e) => e.stopPropagation()}>
                    #{o.id}
                  </Link>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {shortDate(o.createdAt)} {o.createdAt.slice(11)}
                  </span>
                  <span className="ellipsis" style={{ fontWeight: 500 }}>
                    {c?.name}
                  </span>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {c?.phone}
                  </span>
                  <span className="right strong">{money(o.total)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="tag">QPay</span>
                    <Badge spec={payBadge(o)} />
                  </span>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {DELIVERY[o.delivery]}
                  </span>
                  <select
                    className={`${styles.statusSelect} tone-${st.tone}`}
                    value={o.status}
                    aria-label="Төлөв"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => void changeStatus(o, e.target.value as OrderStatus)}
                  >
                    {STATUS_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {STATUS[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {!filtered.length && (
              <Empty
                icon={ReceiptText}
                title="Захиалга олдсонгүй"
                text="Сонгосон шүүлтүүрт тохирох захиалга алга. Хайлт эсвэл огноогоо өөрчилж үзнэ үү."
                action={
                  <button className="btn md ghost" onClick={reset}>
                    Шүүлтүүр арилгах
                  </button>
                }
              />
            )}
          </div>
        </div>
        <div className={styles.pager}>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {filtered.length ? (cur - 1) * PER_PAGE + 1 : 0}–{Math.min(cur * PER_PAGE, filtered.length)} / {filtered.length} захиалга
          </span>
          <Pager page={cur} pages={pages} onPage={setPage} />
        </div>
      </div>
      <div className="print-area print-only">
        {printing.map((o) => (
          <Slip key={o.id} order={o} customer={cust.get(o.customerId)} products={db.products} store={db.settings.store} />
        ))}
      </div>
    </>
  );
}

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1]! > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  return (
    <div className={styles.pages}>
      <button className={styles.pageBtn} onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Өмнөх">
        <ChevronLeft size={17} />
      </button>
      {pageList(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="faint" style={{ padding: "0 4px" }}>
            …
          </span>
        ) : (
          <button key={n} className={styles.pageBtn} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
            {n}
          </button>
        ),
      )}
      <button className={styles.pageBtn} onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} aria-label="Дараах">
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
