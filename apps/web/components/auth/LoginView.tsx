"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Car,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { shippingFor } from "../../lib/catalog";
import { login, register, safeNext, useCustomer } from "../../lib/api/auth";
import { ApiError } from "../../lib/api/client";
import { fmt } from "../../lib/format";
import { useHydrated } from "../../lib/hooks";
import { cartTotals, showToast, useShop } from "../../lib/store/shop";
import { ProductImage } from "../product/ProductImage";
import { Logo } from "../layout/Logo";
import styles from "./LoginView.module.css";

type Tab = "login" | "register";
type Key = "id" | "pw" | "rName" | "rPhone" | "rEmail" | "rPw" | "rPw2";
type Values = Record<Key, string>;

const EMPTY: Values = { id: "", pw: "", rName: "", rPhone: "", rEmail: "", rPw: "", rPw2: "" };
const isPhone = (s: string) => /^\d{8}$/.test(s.replace(/[\s-]/g, ""));
const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

function validate(tab: Tab, v: Values) {
  const e: Partial<Record<Key, string>> = {};
  if (tab === "register") {
    if (!v.rName.trim()) e.rName = "Нэрээ оруулна уу";
    if (!isPhone(v.rPhone)) e.rPhone = "8 оронтой утасны дугаар оруулна уу";
    if (v.rEmail && !isEmail(v.rEmail)) e.rEmail = "И-мэйл хаяг буруу байна";
    if (v.rPw.length < 8) e.rPw = "Нууц үг хамгийн багадаа 8 тэмдэгт байна";
    if (!v.rPw2) e.rPw2 = "Нууц үгээ давтан оруулна уу";
    else if (v.rPw2 !== v.rPw) e.rPw2 = "Нууц үг таарахгүй байна";
  } else {
    if (!v.id.trim()) e.id = "Утас эсвэл и-мэйлээ оруулна уу";
    else if (!isPhone(v.id) && !isEmail(v.id)) e.id = "Утасны дугаар (8 орон) эсвэл и-мэйл оруулна уу";
    if (!v.pw) e.pw = "Нууц үгээ оруулна уу";
  }
  return e;
}

/** API field names → this form's inputs */
const SERVER_FIELDS: Record<Tab, Record<string, Key>> = {
  login: { login: "id", password: "pw" },
  register: { name: "rName", phone: "rPhone", email: "rEmail", password: "rPw" },
};

/**
 * /login — split screen: the form on the left, the brand panel (or, on the
 * way to checkout, the cart summary) on the right. `?next=` is where to go
 * afterwards; `?tab=register` opens the registration form.
 */
export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const gate = next === "/checkout";
  const me = useCustomer();
  const hydrated = useHydrated();
  const { cart, delivery } = useShop();
  const { count, subtotal } = cartTotals(cart);
  const ship = shippingFor(subtotal, delivery);
  const grand = subtotal + ship;
  const showCart = gate && hydrated && cart.length > 0;

  const [tab, setTab] = useState<Tab>(params.get("tab") === "register" ? "register" : "login");
  const [v, setV] = useState<Values>(EMPTY);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [problem, setProblem] = useState<"" | "wrong" | "exists">("");
  const [serverErr, setServerErr] = useState<Partial<Record<Key, string>>>({});

  // Already signed in (or just did) → on to where they were going
  useEffect(() => {
    if (me) router.replace(next);
  }, [me, next, router]);

  const errs = validate(tab, v);
  const err = (k: Key) => (tried ? errs[k] : undefined) ?? serverErr[k];
  const bad = (k: Key) => !!err(k) || (problem === "wrong" && (k === "id" || k === "pw"));
  const bind = (k: Key) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setV((x) => ({ ...x, [k]: val }));
      setProblem("");
      setServerErr((x) => ({ ...x, [k]: undefined }));
    },
  });

  const switchTab = (t: Tab, carry?: Partial<Values>) => {
    setTab(t);
    setTried(false);
    setProblem("");
    setServerErr({});
    if (carry) setV((x) => ({ ...x, ...carry }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (Object.keys(errs).length) return setTried(true);
    setBusy(true);
    try {
      if (tab === "login") await login({ login: v.id.trim(), password: v.pw });
      else
        await register({
          name: v.rName.trim(),
          phone: v.rPhone,
          email: v.rEmail.trim() || undefined,
          password: v.rPw,
        });
      // the effect above follows `next` once the session is set
    } catch (x) {
      setBusy(false);
      if (!(x instanceof ApiError)) return showToast("Алдаа гарлаа. Дахин оролдоно уу");
      if (tab === "login" && x.status === 401) return setProblem("wrong");
      if (tab === "register" && x.status === 409) return setProblem("exists");
      const map = SERVER_FIELDS[tab];
      const fields = Object.fromEntries(
        Object.entries(x.fields ?? {}).flatMap(([k, m]) => (map[k] ? [[map[k], m]] : [])),
      );
      setServerErr(fields);
      if (!Object.keys(fields).length) showToast(x.message);
    }
  };

  const isReg = tab === "register";
  const back = gate ? { href: "/cart", label: "Сагс руу буцах" } : { href: "/", label: "Дэлгүүр рүү буцах" };

  const input = (k: Key, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} {...bind(k)} className={`input ${bad(k) ? "invalid" : ""}`} aria-invalid={bad(k)} />
  );
  const password = (k: Key, placeholder: string, autoComplete: string) => (
    <span className={styles.pwWrap}>
      {input(k, { type: showPw ? "text" : "password", placeholder, autoComplete })}
      <button
        type="button"
        className={styles.pwToggle}
        onClick={() => setShowPw((s) => !s)}
        title={showPw ? "Нуух" : "Харуулах"}
        aria-label={showPw ? "Нууц үг нуух" : "Нууц үг харуулах"}
      >
        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
  const field = (k: Key, label: React.ReactNode, control: React.ReactNode) => (
    <label className="field">
      <span className={styles.label}>{label}</span>
      {control}
      <span className="field-error">{err(k)}</span>
    </label>
  );

  return (
    <div className={styles.split}>
      <main className={styles.main}>
        <div className={`not-mobile ${styles.brandRow}`}>
          <Logo size="md" />
        </div>
        <div className={`only-mobile ${styles.mHead}`}>
          <Logo size="md" />
          <div className={styles.mTagline}>
            <span>Машинд тань тохирох сэлбэг — </span>
            <span className={styles.accent}>нэг дор.</span>
          </div>
          {showCart && (
            <div className={styles.mCart}>
              <ShoppingCart size={15} />
              <span className={styles.mCartText}>Таны сагс · {count} бараа</span>
              <span className={styles.mCartTotal}>{fmt(grand)}</span>
            </div>
          )}
        </div>

        <div className={styles.formArea}>
          <form className={styles.form} onSubmit={submit} noValidate>
            {gate && (
              <div className={styles.note}>
                <Info size={16} />
                <span>Захиалга өгөхийн тулд нэвтэрнэ үү. Таны сагс хадгалагдсан.</span>
              </div>
            )}
            <div className={styles.titles}>
              <h1 className={styles.title}>{isReg ? "Бүртгүүлэх" : "Нэвтрэх"}</h1>
              <p className={styles.sub}>
                {isReg ? "Хэдхэн секундэд бүртгэл үүсгээд захиалгаа хянаарай." : "Машиндаа тохирох сэлбэгээ хурдан ол."}
              </p>
            </div>

            {problem === "wrong" && (
              <div className={styles.alert} data-kind="danger" role="alert">
                <CircleAlert size={18} />
                <span>
                  <b>Утас/и-мэйл эсвэл нууц үг буруу байна.</b> Дахин оролдоно уу.
                </span>
              </div>
            )}
            {problem === "exists" && (
              <div className={styles.alert} data-kind="warn" role="alert">
                <Info size={18} />
                <span>
                  <b>Энэ утас эсвэл и-мэйлээр бүртгэл үүссэн байна.</b>{" "}
                  <button type="button" className={styles.inlineLink} onClick={() => switchTab("login", { id: v.rPhone })}>
                    Нэвтрэх
                  </button>
                </span>
              </div>
            )}

            {isReg ? (
              <div className={styles.fields}>
                {field("rName", "Нэр *", input("rName", { type: "text", placeholder: "Таны нэр", autoComplete: "name" }))}
                {field(
                  "rPhone",
                  "Утасны дугаар *",
                  input("rPhone", { type: "tel", inputMode: "tel", placeholder: "9911 2233", autoComplete: "tel" }),
                )}
                {field(
                  "rEmail",
                  <>
                    <span>И-мэйл</span>
                    <span className={styles.optional}>заавал биш</span>
                  </>,
                  input("rEmail", { type: "email", inputMode: "email", placeholder: "name@mail.mn", autoComplete: "email" }),
                )}
                {field("rPw", "Нууц үг *", password("rPw", "Хамгийн багадаа 8 тэмдэгт", "new-password"))}
                {field("rPw2", "Нууц үг давтах *", password("rPw2", "Нууц үгээ давтан оруулна уу", "new-password"))}
              </div>
            ) : (
              <div className={styles.fields}>
                {field(
                  "id",
                  "Утас эсвэл и-мэйл",
                  input("id", { type: "text", placeholder: "9911 2233 эсвэл name@mail.mn", autoComplete: "username" }),
                )}
                {field("pw", "Нууц үг", password("pw", "Нууц үгээ оруулна уу", "current-password"))}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={busy} aria-busy={busy}>
              {busy && <span className={styles.spinner} />}
              <span>{busy ? (isReg ? "Бүртгэж байна…" : "Нэвтэрч байна…") : isReg ? "Бүртгүүлэх" : "Нэвтрэх"}</span>
            </button>
            <div className={styles.switch}>
              <span>{isReg ? "Бүртгэлтэй юу?" : "Бүртгэлгүй юу?"} </span>
              <button type="button" className={styles.switchLink} onClick={() => switchTab(isReg ? "login" : "register")}>
                {isReg ? "Нэвтрэх" : "Бүртгүүлэх"}
              </button>
            </div>
            <div className={styles.foot}>
              <Link href={back.href} className={styles.back}>
                <ArrowLeft size={14} />
                <span>{back.label}</span>
              </Link>
            </div>
          </form>
        </div>
      </main>

      <aside className={`not-mobile ${styles.aside}`}>
        <div className={styles.disc} aria-hidden />
        <div className={styles.accentBar} aria-hidden />
        <div className={styles.hero}>
          <span className={styles.eyebrow}>МОНГОЛЫН АВТО СЭЛБЭГИЙН ДЭЛГҮҮР</span>
          <h2 className={styles.heroTitle}>
            <span>Машинд тань тохирох сэлбэг — </span>
            <span className={styles.accent}>нэг дор.</span>
          </h2>
          <p className={styles.heroText}>OEM дугаараар хайж, тохирохыг шалгаад, QPay-ээр төлөөрэй.</p>
        </div>

        <div className={styles.cards}>
          {showCart ? (
            <div className={styles.card} data-cart>
              <div className={styles.cartHead}>
                <span className={styles.cartEyebrow}>ТАНЫ САГС · {count} БАРАА</span>
                <Link href="/cart" className={styles.cartBack}>
                  <ArrowLeft size={13} />
                  <span>Сагс руу буцах</span>
                </Link>
              </div>
              {cart.map((l) => (
                <div key={l.product.id} className={styles.line}>
                  <ProductImage product={l.product} iconSize={18} className={styles.thumb} />
                  <div className={styles.lineText}>
                    <div className={styles.lineName}>{l.product.name}</div>
                    <div className={styles.lineMeta}>
                      {l.product.brand} · × {l.qty}
                    </div>
                  </div>
                  <span className={styles.lineTotal}>{fmt(l.product.price * l.qty)}</span>
                </div>
              ))}
              <div className={styles.cartTotal}>
                <span>Нийт · хүргэлт {ship ? fmt(ship) : "Үнэгүй"}</span>
                <span className={styles.cartGrand}>{fmt(grand)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.card} data-row>
                <span className={styles.cardIcon}>
                  <Car size={19} />
                </span>
                <div className={styles.cardText}>
                  <div className={styles.cardSmall}>Машинаа сонгоход</div>
                  <div className={styles.cardBig}>Зөвхөн тохирох сэлбэг</div>
                </div>
                <span className={styles.fitTag}>
                  <CircleCheck size={13} />
                  <span>Тохирно</span>
                </span>
              </div>
              <div className={`${styles.card} ${styles.cardShift}`}>
                <div className={styles.cardRow}>
                  <Truck size={16} className={styles.accent} />
                  <span>Захиалгаа бодит цагт хянана</span>
                </div>
                <div className={styles.progress} aria-hidden>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} data-on={i <= 4} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.badges}>
          <span>
            <ShieldCheck size={15} />
            <span>Оригинал &amp; аналог</span>
          </span>
          <span>
            <QrCode size={15} />
            <span>QPay төлбөр</span>
          </span>
          <span>
            <Truck size={15} />
            <span>Хотын хүргэлт</span>
          </span>
        </div>
      </aside>
    </div>
  );
}
