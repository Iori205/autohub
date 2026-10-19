"use client";

import { CircleAlert, CircleCheck, CircleHelp, Info, TriangleAlert, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  closeConfirm,
  closeForm,
  dismissToast,
  toast,
  useUi,
  type ConfirmConfig,
  type FormConfig,
  type FormValues,
} from "../../lib/ui";
import { Modal } from "./Modal";
import styles from "./Overlays.module.css";

export function Overlays() {
  const { form, confirm, toasts } = useUi();
  return (
    <>
      {/* key remounts the form state for every new modal */}
      {form && <FormModal key={form.title + Object.keys(form.values).join()} cfg={form} />}
      {confirm && <ConfirmDialog cfg={confirm} />}
      <div className={styles.toasts} aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.kind === "ok" ? CircleCheck : t.kind === "err" ? CircleAlert : Info;
          return (
            <div key={t.id} className={styles.toast} data-kind={t.kind}>
              <Icon size={19} className={styles.toastIcon} />
              <span>{t.msg}</span>
              <button className="icon-btn" onClick={() => dismissToast(t.id)} aria-label="Хаах">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function FormModal({ cfg }: { cfg: FormConfig }) {
  const [values, setValues] = useState<FormValues>(cfg.values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setV = (k: string, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    for (const f of cfg.fields)
      if (f.required && !String(values[f.key] ?? "").trim()) err[f.key] = "Заавал бөглөнө";
    if (!Object.keys(err).length && cfg.validate)
      for (const [k, m] of Object.entries(cfg.validate(values))) if (m) err[k] = m;
    if (Object.keys(err).length) return setErrors(err);
    setBusy(true);
    try {
      await cfg.onSubmit(values);
      closeForm();
    } catch (x) {
      // API errors: field messages next to matching inputs, the rest as a toast
      const fields = (x as { fields?: Record<string, string> }).fields ?? {};
      const mine = Object.fromEntries(Object.entries(fields).filter(([k]) => cfg.fields.some((f) => f.key === k)));
      setErrors(mine);
      toast((x as Error).message || "Алдаа гарлаа", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={cfg.title} desc={cfg.desc} onClose={closeForm}>
      <form onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          {cfg.fields.map((f) => {
            const t = f.type ?? "text";
            const invalid = !!errors[f.key];
            const common = {
              id: `f-${f.key}`,
              value: values[f.key] ?? "",
              "aria-invalid": invalid,
              onChange: (e: { target: { value: string } }) => setV(f.key, e.target.value),
            };
            return (
              <label
                key={f.key}
                className="field"
                style={{ gridColumn: f.full || t === "textarea" ? "1 / -1" : "auto" }}
              >
                <span>
                  <span>{f.label}</span>
                  {f.required && <span className="req"> *</span>}
                </span>
                {t === "select" ? (
                  <select className="select lg" {...common}>
                    {(f.options ?? []).map((o) => {
                      const [v, l] = Array.isArray(o) ? o : [o, o || "Сонгох…"];
                      return (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      );
                    })}
                  </select>
                ) : t === "textarea" ? (
                  <textarea className="textarea" rows={3} placeholder={f.placeholder} {...common} />
                ) : (
                  <input className="input lg" type={t} placeholder={f.placeholder} {...common} />
                )}
                {invalid && <span className="field-err">{errors[f.key]}</span>}
              </label>
            );
          })}
        </div>
        <div className={styles.foot}>
          <button type="button" className="btn" onClick={closeForm}>
            Болих
          </button>
          <button type="submit" className={`btn ${cfg.danger ? "danger" : "primary"}`} disabled={busy}>
            {busy && <span className="spinner" />}
            <span>{cfg.submit ?? "Хадгалах"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDialog({ cfg }: { cfg: ConfirmConfig }) {
  const Icon = cfg.danger ? TriangleAlert : CircleHelp;
  return (
    <div className={styles.backdrop} style={{ zIndex: 80 }} onClick={closeConfirm}>
      <div className={styles.confirm} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmBody}>
          <span className={styles.confirmIcon} data-danger={!!cfg.danger}>
            <Icon size={20} />
          </span>
          <div>
            <h2>{cfg.title}</h2>
            <p>{cfg.msg}</p>
          </div>
        </div>
        <div className={styles.confirmActions}>
          <button className="btn" onClick={closeConfirm}>
            Болих
          </button>
          <button
            className={`btn ${cfg.danger ? "danger" : "primary"}`}
            autoFocus
            onClick={() => {
              closeConfirm();
              void Promise.resolve(cfg.onOk()).catch((x: Error) => toast(x.message || "Алдаа гарлаа", "err"));
            }}
          >
            {cfg.ok ?? "Тийм"}
          </button>
        </div>
      </div>
    </div>
  );
}
