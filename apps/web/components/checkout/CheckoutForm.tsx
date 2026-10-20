"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, Clock, Store, Truck } from "lucide-react";
import { FREE_SHIPPING_FROM, shippingFor } from "../../lib/catalog";
import { useCustomer } from "../../lib/api/auth";
import { ApiError } from "../../lib/api/client";
import { createOrder } from "../../lib/api/orders";
import { fmt } from "../../lib/format";
import { useHydrated } from "../../lib/hooks";
import { cartTotals, clearCart, setDelivery, useShop, showToast } from "../../lib/store/shop";
import type { CheckoutForm as Form, DeliveryMethod } from "../../lib/types";
import { CheckoutSteps } from "./CheckoutSteps";
import { ItemRows, QPayBadge } from "./parts";
import c from "./checkout.module.css";
import styles from "./CheckoutForm.module.css";

const DISTRICTS = [
  "Багануур",
  "Багахангай",
  "Баянгол",
  "Баянзүрх",
  "Налайх",
  "Сонгинохайрхан",
  "Сүхбаатар",
  "Хан-Уул",
  "Чингэлтэй",
];
const KHOROOS = Array.from({ length: 32 }, (_, i) => `${i + 1}-р хороо`);

/** Нэвтрэх гэж гарахаас өмнө бичсэнийг буцаж ирэхэд сэргээнэ. */
const DRAFT_KEY = "autohub:checkout-draft";
const LOGIN_HREF = "/login?next=/checkout";

type ErrKey = "name" | "phone" | "email" | "district" | "khoroo" | "addr";

function validate(f: Form, delivery: DeliveryMethod) {
  const e: Partial<Record<ErrKey, string>> = {};
  if (!f.name.trim()) e.name = "Нэрээ оруулна уу";
  if (!/^\d{8}$/.test(f.phone.replace(/\s/g, "")))
    e.phone = "8 оронтой утасны дугаар оруулна уу";
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "И-мэйл хаяг буруу байна";
  if (delivery === "ship") {
    if (!f.district) e.district = "Дүүрэг сонгоно уу";
    if (!f.khoroo) e.khoroo = "Хороо сонгоно уу";
    if (!f.addr.trim()) e.addr = "Хаягаа оруулна уу";
  }
  return e;
}

export function CheckoutForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { cart, delivery, car } = useShop();
  const { subtotal } = cartTotals(cart);
  const ship = shippingFor(subtotal, delivery);
  const [form, setForm] = useState<Form>({
    name: "",
    phone: "",
    email: "",
    district: "",
    khoroo: "",
    addr: "",
    note: "",
  });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const me = useCustomer();

  // /login-оос буцаж ирэхэд ноорогоо сэргээгээд нэр/утас/и-мэйлийг бүртгэлээс бөглөнө
  useEffect(() => {
    if (!me) return;
    let draft: Partial<Form> = {};
    try {
      draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Form>;
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* хадгалах сан хаалттай */
    }
    setForm((f) => {
      const d = { ...f, ...draft };
      return { ...d, name: d.name || me.name || "", phone: d.phone || me.phone || "", email: d.email || me.email || "" };
    });
  }, [me]);

  const toLogin = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* хадгалах сан хаалттай */
    }
    router.push(LOGIN_HREF);
  };

  const errs = validate(form, delivery);
  const err = (k: ErrKey) => (tried ? errs[k] : undefined);
  const bind = (k: keyof Form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  const confirm = async () => {
    // Захиалгад бүртгэл хэрэгтэй; бүртгүүлэх/нэвтрэхэд энэ сагс хадгалагдана
    if (!me) return toLogin();
    if (Object.keys(errs).length) {
      setTried(true);
      return;
    }
    setBusy(true);
    try {
      const order = await createOrder({ form, delivery, car });
      clearCart();
      router.push(`/checkout/payment?order=${order.no}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return toLogin();
      // сервер дахин шалгаж (үнийг ч дахин бодно) монгол мессежээ буцаана
      showToast(e instanceof ApiError ? Object.values(e.fields ?? {})[0] ?? e.message : "Алдаа гарлаа. Дахин оролдоно уу");
      setBusy(false);
    }
  };

  if (!hydrated) return <main className={`container ${c.page}`} />;

  if (!cart.length && !busy) {
    return (
      <main className={`container ${c.page}`} data-checkout-flow>
        <CheckoutSteps step={2} />
        <div className={c.empty}>
          <div className={c.emptyTitle}>Таны сагс хоосон байна</div>
          <div className={c.emptyActions} style={{ marginTop: 16 }}>
            <Link href="/cart" className="btn">
              <ArrowLeft size={16} />
              Сагс руу буцах
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const deliveryOpts = [
    {
      k: "ship" as const,
      Icon: Truck,
      t: "Хүргэлт",
      s: "Улаанбаатар хотод 24 цагийн дотор",
      price: subtotal >= FREE_SHIPPING_FROM ? "Үнэгүй" : "5,000₮",
    },
    {
      k: "pickup" as const,
      Icon: Store,
      t: "Очиж авах",
      s: "Хан-Уул салбар · Даваа–Бямба 09:00–20:00",
      price: "Үнэгүй",
    },
  ];

  const field = (k: ErrKey, label: React.ReactNode, input: React.ReactNode) => (
    <label className="field">
      {/* нэг мөрийн шошго тул нэг мөрийн оролтууд тэгшрэнэ */}
      <span className="field-label">{label}</span>
      {input}
      <span className="field-error">{err(k)}</span>
    </label>
  );

  return (
    <main className={`container ${c.page}`} data-checkout-flow>
      <CheckoutSteps step={2} />
      <h1 className={`page-title ${c.h1}`}>Захиалгын мэдээлэл</h1>
      <div className={c.layout}>
        <div className={c.mainCol}>
          <section className={`panel ${styles.section}`}>
            <h2 className="panel-title">Холбоо барих</h2>
            <div className={styles.grid220}>
              {field(
                "name",
                "Нэр *",
                <input
                  {...bind("name")}
                  placeholder="Таны нэр"
                  autoComplete="name"
                  className={`input ${err("name") ? "invalid" : ""}`}
                />,
              )}
              {field(
                "phone",
                "Утасны дугаар *",
                <input
                  {...bind("phone")}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="9911 2233"
                  className={`input ${err("phone") ? "invalid" : ""}`}
                />,
              )}
              {field(
                "email",
                <>
                  И-мэйл <span className={styles.optional}>(заавал биш)</span>
                </>,
                <input
                  {...bind("email")}
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@mail.mn"
                  className={`input ${err("email") ? "invalid" : ""}`}
                />,
              )}
            </div>
          </section>

          <section className={`panel ${styles.section}`}>
            <h2 className="panel-title">Хүлээн авах арга</h2>
            <div className={styles.grid220} style={{ gap: 12 }}>
              {deliveryOpts.map((o) => (
                <button
                  key={o.k}
                  className={styles.radio}
                  data-on={delivery === o.k}
                  onClick={() => setDelivery(o.k)}
                >
                  <span className={styles.radioDot}>
                    <span />
                  </span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div className={styles.radioTitle}>
                      <o.Icon size={16} />
                      {o.t}
                    </div>
                    <div className={styles.radioSub}>{o.s}</div>
                  </div>
                  <span className={styles.radioPrice}>{o.price}</span>
                </button>
              ))}
            </div>

            {delivery === "ship" ? (
              <>
                <div className={styles.grid200}>
                  {field(
                    "district",
                    "Дүүрэг *",
                    <span className="select-wrap">
                      <select
                        {...bind("district")}
                        className={`input ${err("district") ? "invalid" : ""}`}
                      >
                        <option value="">Сонгох</option>
                        {DISTRICTS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </span>,
                  )}
                  {field(
                    "khoroo",
                    "Хороо *",
                    <span className="select-wrap">
                      <select
                        {...bind("khoroo")}
                        className={`input ${err("khoroo") ? "invalid" : ""}`}
                      >
                        <option value="">Сонгох</option>
                        {KHOROOS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </span>,
                  )}
                </div>
                {field(
                  "addr",
                  "Дэлгэрэнгүй хаяг *",
                  <textarea
                    {...bind("addr")}
                    rows={3}
                    placeholder="Байр, орц, давхар, тоот, тэмдэгт газар"
                    className={`input ${err("addr") ? "invalid" : ""}`}
                  />,
                )}
              </>
            ) : (
              <div className={styles.pickup}>
                <span className={styles.pickupIcon}>
                  <Store size={20} />
                </span>
                <div className={styles.pickupBody}>
                  <div style={{ fontWeight: 800 }}>Хан-Уул салбар</div>
                  <div style={{ color: "var(--mut)", lineHeight: 1.5 }}>
                    Улаанбаатар, Хан-Уул дүүрэг, 15-р хороо, Чингисийн өргөн чөлөө 24
                  </div>
                  <div className={styles.hours}>
                    <Clock size={14} style={{ color: "var(--mut)" }} />
                    Даваа–Бямба 09:00–20:00 · Ням 10:00–17:00
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mut)" }}>
                    Төлбөр баталгаажсаны дараа SMS ирэхэд ирж авна уу.
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={`panel ${styles.section}`} style={{ gap: 12 }}>
            <h2 className="panel-title">Захиалгын тэмдэглэл</h2>
            <textarea
              {...bind("note")}
              rows={3}
              placeholder="Жишээ нь: VIN дугаар, хүргэлтийн цаг, нэмэлт хүсэлт"
              className="input"
            />
          </section>
        </div>

        <aside className={c.aside}>
          <div className="eyebrow">ТАНЫ ЗАХИАЛГА</div>
          <ItemRows
            items={cart.map((l) => ({
              name: l.product.name,
              qty: l.qty,
              total: l.product.price * l.qty,
            }))}
          />
          <div className={`${c.totals} ${c.totalsDivided}`}>
            <div className={c.kv}>
              <span>Барааны дүн</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className={c.kv}>
              <span>Хүргэлтийн төлбөр</span>
              <span>{ship ? fmt(ship) : "Үнэгүй"}</span>
            </div>
            <div className={c.grand}>
              <span>Нийт төлөх</span>
              <span className={c.grandValue}>{fmt(subtotal + ship)}</span>
            </div>
          </div>
          <div className={styles.payNote}>
            <QPayBadge size="md" />
            <div>
              <b>Төлбөр: QPay</b>
              <div style={{ color: "var(--mut)" }}>
                Баталгаажуулсны дараа QPay нэхэмжлэх үүснэ.
              </div>
            </div>
          </div>
          {tried && Object.keys(errs).length > 0 && (
            <div className="field-error" style={{ fontSize: 13 }}>
              Шаардлагатай талбаруудыг бөглөнө үү.
            </div>
          )}
          <button className="btn btn-primary btn-lg" onClick={confirm} disabled={busy || me === undefined}>
            <span>Захиалга баталгаажуулах</span>
          </button>
          <Link href="/cart" className="btn-link">
            <ArrowLeft size={15} />
            Сагс руу буцах
          </Link>
        </aside>
      </div>
    </main>
  );
}
