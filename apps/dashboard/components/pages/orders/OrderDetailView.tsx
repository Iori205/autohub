"use client";

import Link from "next/link";
import {
  Ban,
  CarFront,
  CircleCheckBig,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { addOrderNote } from "../../../lib/api/orders";
import { useDb } from "../../../lib/db";
import { dotted, initials, money, shortDateTime } from "../../../lib/format";
import { statusTime } from "../../../lib/data/seed";
import { DELIVERY, FLOW, STATUS, STATUS_KEYS, payBadge, typeBadge } from "../../../lib/status";
import type { Db, Order, OrderStatus } from "../../../lib/types";
import { toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Empty, Panel, Thumb } from "../../ui/bits";
import { Modal } from "../../ui/Modal";
import { NEXT_STEP, canCancel, changeStatus, openCancel, runPaymentCheck } from "./actions";
import { Slip } from "./Slip";
import styles from "./Orders.module.css";

const STEP_LABEL: Record<OrderStatus, string> = {
  pending: "Захиалга үүссэн · QPay нэхэмжлэх илгээсэн",
  paid: "Төлбөр төлөгдсөн (QPay)",
  preparing: "Бэлтгэж эхэлсэн",
  shipping: "Хүргэлтэнд гарсан",
  delivered: "Хүргэгдсэн",
  cancelled: "Захиалга цуцлагдсан",
  expired: "Нэхэмжлэхийн хугацаа дууссан (30 мин)",
};
const STEP_BY: Record<OrderStatus, string> = {
  pending: "Харилцагч · вэб",
  paid: "QPay callback",
  preparing: "Сүхбат Н.",
  shipping: "Сүхбат Н. · Жолооч Бат",
  delivered: "Жолооч Бат",
  cancelled: "Ганболд Б.",
  expired: "Систем",
};
const NEXT_ICON = { pending: RefreshCw, paid: Package, preparing: Truck, shipping: CircleCheckBig } as const;

export function OrderDetailView({ id }: { id: string }) {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  const order = db.orders.find((o) => o.id === id);
  if (!order)
    return (
      <>
        <PageHeader crumbs={[{ label: "Захиалгууд", href: "/orders" }, { label: `#${id}` }]} title={`Захиалга #${id}`} />
        <div className="panel">
          <Empty
            icon={ReceiptText}
            title="Захиалга олдсонгүй"
            text={`#${id} дугаартай захиалга байхгүй байна.`}
            action={
              <Link href="/orders" className="btn md ghost">
                Захиалгууд руу буцах
              </Link>
            }
          />
        </div>
      </>
    );
  return <OrderDetail db={db} order={order} />;
}

function OrderDetail({ db, order: o }: { db: Db; order: Order }) {
  const [nextSt, setNextSt] = useState("");
  const [note, setNote] = useState("");
  const [slip, setSlip] = useState(false);
  const c = db.customers.find((x) => x.id === o.customerId);
  const next = NEXT_STEP[o.status];
  const NextIcon = NEXT_ICON[o.status as keyof typeof NEXT_ICON];

  const steps: { k: OrderStatus; done: boolean; current: boolean }[] =
    o.status === "cancelled" || o.status === "expired"
      ? [
          ...(o.paid ? (["pending", "paid"] as const) : (["pending"] as const)).map((k) => ({ k, done: true, current: false })),
          { k: o.status, done: true, current: true },
        ]
      : FLOW.map((k, i) => ({ k, done: i <= FLOW.indexOf(o.status), current: k === o.status }));

  const car = c?.cars[0];
  const nOrders = db.orders.filter((x) => x.customerId === o.customerId).length;
  const vin = "JTMHV05J" + String(604000 + ((parseInt(o.id.slice(1)) * 37) % 9999)).padStart(9, "0");

  const apply = async () => {
    if (!nextSt) return toast("Шинэ төлөв сонгоно уу", "err");
    if (nextSt === o.status) return toast("Захиалга аль хэдийн энэ төлөвт байна", "info");
    await changeStatus(o, nextSt as OrderStatus);
    setNextSt("");
  };

  const saveNote = async () => {
    if (!note.trim()) return toast("Тэмдэглэл хоосон байна", "err");
    await addOrderNote(o.id, note.trim());
    setNote("");
    toast("Тэмдэглэл хадгалагдлаа", "ok");
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Захиалгууд", href: "/orders" }, { label: `#${o.id}` }]}
        title={`Захиалга #${o.id}`}
        sub={`${o.createdAt} · ${c?.name ?? ""} · ${money(o.total)}`}
        actions={
          <>
            <button className="btn" onClick={() => setSlip(true)}>
              <Printer size={17} />
              Баглаа баримт хэвлэх
            </button>
            {canCancel(o) && (
              <button className="btn text-danger" onClick={() => openCancel(o)}>
                <Ban size={17} />
                Цуцлах
              </button>
            )}
            {next && NextIcon && (
              <button
                className="btn primary"
                onClick={() => (next[1] === "check" ? runPaymentCheck(o) : changeStatus(o, next[1]))}
              >
                <NextIcon size={17} />
                {next[0]}
              </button>
            )}
          </>
        }
      />
      <div className="row-wrap">
        <div className="stack" style={{ flex: "2 1 600px", minWidth: 0 }}>
          <Panel
            title={`Бараа (${o.items.length})`}
            clip
            action={
              <div style={{ display: "flex", gap: 6 }}>
                <Badge spec={STATUS[o.status]} dot lg />
                <Badge spec={payBadge(o)} lg />
              </div>
            }
          >
            <div className="tbl-scroll">
              <div style={{ minWidth: 560 }}>
                {o.items.map((it) => {
                  const p = db.products.find((x) => x.id === it.productId);
                  return (
                    <div key={it.productId} className={`tr ${styles.itemCols}`}>
                      <Thumb product={p} categories={db.categories} size={52} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        {p ? (
                          <Link href={`/products/${p.id}`} style={{ color: "var(--text)", fontWeight: 500 }}>
                            {it.name}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{it.name}</span>
                        )}
                        <span className="muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                          {p?.brand}
                          {p && <Badge spec={typeBadge(p.genuine)} />}
                        </span>
                      </div>
                      <span className="mono muted" style={{ fontSize: 12 }}>
                        {p?.oem[0]}
                      </span>
                      <span className="right muted">× {it.qty}</span>
                      <span className="right muted">{money(it.price)}</span>
                      <span className="right strong">{money(it.price * it.qty)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.totals}>
              <div>
                <span>Барааны дүн</span>
                <span>{money(o.subtotal)}</span>
              </div>
              <div>
                <span>Хүргэлт · {DELIVERY[o.delivery]}</span>
                <span>{o.shipping ? money(o.shipping) : "Үнэгүй"}</span>
              </div>
              <div className={styles.grand}>
                <span>Нийт</span>
                <span>{money(o.total)}</span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Төлөвийн түүх"
            action={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select className="select" value={nextSt} onChange={(e) => setNextSt(e.target.value)} aria-label="Шинэ төлөв">
                  <option value="">Шинэ төлөв сонгох…</option>
                  {STATUS_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {STATUS[k].label}
                    </option>
                  ))}
                </select>
                <button className="btn primary md" onClick={apply}>
                  <RefreshCw size={16} />
                  Төлөв шинэчлэх
                </button>
              </div>
            }
          >
            <div className={styles.timeline}>
              {steps.map((s, i) => {
                const nextDone = steps[i + 1]?.done;
                const dot = !s.done
                  ? "var(--border)"
                  : s.k === "cancelled"
                    ? "var(--danger)"
                    : s.k === "expired"
                      ? "var(--muted)"
                      : "var(--accent)";
                return (
                  <div key={s.k} className={styles.step}>
                    <div className={styles.stepRail}>
                      <span
                        className={styles.stepDot}
                        style={{ background: dot, boxShadow: s.current ? "0 0 0 4px var(--accent-soft)" : "none" }}
                      />
                      {i < steps.length - 1 && (
                        <span className={styles.stepLine} style={{ background: nextDone ? "var(--accent)" : "var(--border)" }} />
                      )}
                    </div>
                    <div className={styles.stepBody}>
                      <div>
                        <span style={{ fontWeight: 500, color: s.done ? "var(--text)" : "var(--faint)" }}>{STEP_LABEL[s.k]}</span>
                        <span className="faint" style={{ fontSize: 12 }}>
                          {s.done ? STEP_BY[s.k] : ""}
                        </span>
                      </div>
                      <span className="mono muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        {s.done ? shortDateTime(statusTime(o, s.k)) : "Хүлээгдэж байна"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Дотоод тэмдэглэл" sub="Зөвхөн ажилтнуудад харагдана">
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {o.notes.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span className="avatar" style={{ width: 28, height: 28 }}>
                    {initials(n.by)}
                  </span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                      <strong>{n.by}</strong>
                      <span className="faint">{shortDateTime(n.at)}</span>
                    </div>
                    <div>{n.text}</div>
                  </div>
                </div>
              ))}
              <textarea
                className="textarea"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Тэмдэглэл бичих… (жишээ: Харилцагч орой хүргүүлэхийг хүссэн)"
                aria-label="Тэмдэглэл"
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn md ghost" onClick={saveNote}>
                  Тэмдэглэл нэмэх
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="stack" style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Panel
            title="Харилцагч"
            action={
              c && (
                <Link href={`/customers?c=${c.id}`} className="link-btn">
                  Профайл
                </Link>
              )
            }
          >
            <div className={styles.side}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                  {initials(c?.name ?? "")}
                </span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong>{c?.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {nOrders} захиалга · {c?.registeredAt.slice(0, 4)} оноос
                  </span>
                </div>
              </div>
              <div className={styles.contact}>
                <Phone size={16} />
                <span className="mono">{c?.phone}</span>
              </div>
              <div className={styles.contact}>
                <Mail size={16} />
                <span>{c?.email}</span>
              </div>
              <div className={styles.contact} style={{ alignItems: "flex-start", paddingTop: 10, borderTop: "1px solid var(--divider)" }}>
                <MapPin size={16} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{o.address}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {DELIVERY[o.delivery]} · {o.shipping ? money(o.shipping) : "Үнэгүй"}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Машин">
            <div className={styles.side} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <span className="icon-tile" style={{ width: 40, height: 40, borderRadius: 9 }}>
                <CarFront size={21} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <strong>{car ? `${car.make} ${car.model} ${car.year}` : "Машин сонгоогүй"}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {car?.engine ?? "—"}
                </span>
                {car && (
                  <span className="mono faint" style={{ fontSize: 11.5 }}>
                    VIN {vin}
                  </span>
                )}
              </div>
            </div>
          </Panel>
          <Panel title="Төлбөр" action={<span className="tag" style={{ color: "var(--text)" }}>QPay</span>}>
            <div className={styles.pay}>
              {[
                ["Нэхэмжлэх ID", o.invoiceId],
                ["Төлбөрийн ID", o.paid ? o.paymentId : "—"],
                ["Төлсөн огноо", o.paid ? dotted(statusTime(o, "paid")) : "—"],
                ["Дүн", money(o.total)],
              ].map(([k, v]) => (
                <div key={k} className={styles.payRow}>
                  <span className="muted">{k}</span>
                  <span className="mono">{v}</span>
                </div>
              ))}
              <div className={styles.payRow} style={{ border: "none", padding: "10px 0 12px" }}>
                <span className="muted">Төлөв</span>
                <Badge spec={payBadge(o)} lg />
              </div>
              <button className="btn md ghost" onClick={() => runPaymentCheck(o)}>
                <RefreshCw size={16} />
                QPay төлөв шалгах
              </button>
            </div>
          </Panel>
        </div>
      </div>
      {slip && (
        <Modal
          title={`Баглаа баримт · #${o.id}`}
          width={600}
          onClose={() => setSlip(false)}
          headerExtra={
            <button className="btn primary md" onClick={() => window.print()}>
              <Printer size={16} />
              Хэвлэх
            </button>
          }
        >
          <div className="print-area" style={{ padding: 18 }}>
            <Slip order={o} customer={c} products={db.products} store={db.settings.store} />
          </div>
        </Modal>
      )}
    </>
  );
}
