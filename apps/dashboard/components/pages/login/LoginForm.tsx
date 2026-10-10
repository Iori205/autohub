"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthError, login } from "../../../lib/api/auth";
import { shortName } from "../../../lib/format";
import { toast } from "../../../lib/ui";
import { Logo } from "../../shell/Logo";
import styles from "./Login.module.css";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("admin@autohub.mn");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<{ email?: string; pass?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: typeof err = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = "Зөв и-мэйл хаяг оруулна уу";
    if (pass.length < 6) er.pass = pass ? "Нууц үг хамгийн багадаа 6 тэмдэгт" : "Нууц үгээ оруулна уу";
    if (Object.keys(er).length) return setErr(er);
    setBusy(true);
    try {
      const s = await login(email, pass, remember);
      toast(`Тавтай морил, ${shortName(s.name).split(" ")[0]}!`, "ok");
      router.replace(next);
    } catch (x) {
      setErr({ form: x instanceof AuthError ? x.message : "Нэвтрэх үед алдаа гарлаа" });
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Logo size="lg" />
        <form className={styles.card} onSubmit={submit} noValidate>
          <div>
            <h1>Нэвтрэх</h1>
            <p>Удирдлагын хэсэгт нэвтрэхийн тулд бүртгэлээ оруулна уу.</p>
          </div>
          {err.form && (
            <div className={styles.formErr} role="alert">
              {err.form}
            </div>
          )}
          <label className="field">
            И-мэйл
            <input
              className={`input ${styles.input}`}
              type="email"
              autoComplete="username"
              value={email}
              aria-invalid={!!err.email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErr({ ...err, email: "", form: "" });
              }}
              placeholder="admin@autohub.mn"
            />
            {err.email && <span className="field-err">{err.email}</span>}
          </label>
          <label className="field">
            Нууц үг
            <div className={styles.passWrap}>
              <input
                className={`input ${styles.input}`}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={pass}
                aria-invalid={!!err.pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setErr({ ...err, pass: "", form: "" });
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShow(!show)}
                aria-label={show ? "Нууц үг нуух" : "Нууц үг харах"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {err.pass && <span className="field-err">{err.pass}</span>}
          </label>
          <div className={styles.row}>
            <label className={styles.remember}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Намайг сана
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast("Нууц үг сэргээх холбоос удахгүй нэмэгдэнэ — админтайгаа холбогдоно уу", "info");
              }}
            >
              Нууц үг мартсан?
            </a>
          </div>
          <button type="submit" className={`btn primary ${styles.submit}`} disabled={busy}>
            {busy && <span className="spinner" />}
            Нэвтрэх
          </button>
        </form>
        <div className={styles.foot}>© 2026 AuToHub · Зөвхөн ажилтнуудад зориулав</div>
      </div>
    </div>
  );
}
