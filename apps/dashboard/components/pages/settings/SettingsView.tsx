"use client";

import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  Headset,
  Plus,
  QrCode,
  Radio,
  ShieldCheck,
  ShieldUser,
  Store,
  Trash2,
  Truck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "../../../lib/api/auth";
import { inviteAdmin, removeAdmin, saveSettings, setAdminRole, testQPay } from "../../../lib/api/settings";
import { useDb } from "../../../lib/db";
import { initials } from "../../../lib/format";
import { newId } from "../../../lib/ids";
import type { SettingsTab } from "../../../lib/settings-tabs";
import type { AdminRole, Db, Settings } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Panel, Segmented, Switch } from "../../ui/bits";
import styles from "./Settings.module.css";

const TABS: [SettingsTab, string, typeof Store][] = [
  ["store", "Дэлгүүр", Store],
  ["delivery", "Хүргэлт", Truck],
  ["qpay", "QPay төлбөр", QrCode],
  ["admins", "Админ & эрх", ShieldCheck],
];

const ROLE_LABEL: Record<AdminRole, string> = { admin: "Админ", operator: "Оператор" };

export function SettingsView({ tab }: { tab: SettingsTab }) {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <SettingsForm db={db} tab={tab} />;
}

type Errors = Partial<Record<"name" | "phone" | "username" | "invoiceCode", string>>;

function SettingsForm({ db, tab }: { db: Db; tab: SettingsTab }) {
  const router = useRouter();
  // Edits stay local until "Хадгалах"; admin changes apply immediately.
  const [s, setS] = useState<Settings>(() => structuredClone(db.settings));
  const [err, setErr] = useState<Errors>({});
  const dirty = JSON.stringify(s) !== JSON.stringify(db.settings);

  const setStore = (k: keyof Settings["store"], v: string) => {
    setS((x) => ({ ...x, store: { ...x.store, [k]: v } }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };
  const setQ = <K extends keyof Settings["qpay"]>(k: K, v: Settings["qpay"][K]) => {
    setS((x) => ({ ...x, qpay: { ...x.qpay, [k]: v } }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };
  const setZone = (id: string, patch: Partial<Settings["zones"][number]>) =>
    setS((x) => ({ ...x, zones: x.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));

  const save = async () => {
    const e: Errors = {};
    if (!s.store.name.trim()) e.name = "Нэр оруулна уу";
    if (!/^\d{4}-?\d{4}$/.test(s.store.phone.trim())) e.phone = "8 оронтой утасны дугаар (жишээ: 7711-2233)";
    if (!s.qpay.demo && !s.qpay.username.trim()) e.username = "Merchant username шаардлагатай";
    if (!s.qpay.demo && !s.qpay.invoiceCode.trim()) e.invoiceCode = "Invoice code шаардлагатай";
    setErr(e);
    if (Object.keys(e).length) return toast("Тохиргоонд алдаа байна", "err");
    await saveSettings({ ...s, freeOver: Number(s.freeOver) || 0, zones: s.zones.map((z) => ({ ...z, fee: Number(z.fee) || 0 })) });
    toast("Тохиргоо хадгалагдлаа", "ok");
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Тохиргоо" }]}
        title="Тохиргоо"
        sub="Дэлгүүр, хүргэлт, төлбөр болон админ хэрэглэгчид"
        actions={
          <button className="btn primary" onClick={save}>
            <Check size={17} />
            Хадгалах{dirty ? " •" : ""}
          </button>
        }
      />
      <div className="stack">
        <div className={styles.tabs} role="tablist">
          {TABS.map(([k, l, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={styles.tab}
              onClick={() => router.replace(k === "store" ? "/settings" : `/settings?tab=${k}`, { scroll: false })}
            >
              <Icon size={16} />
              {l}
            </button>
          ))}
        </div>

        {tab === "store" && (
          <Panel title="Дэлгүүрийн мэдээлэл" style={{ maxWidth: 820 }}>
            <div className={styles.grid}>
              {(
                [
                  ["name", "Дэлгүүрийн нэр", true],
                  ["phone", "Утас", true],
                  ["email", "И-мэйл", false],
                  ["hours", "Ажлын цаг", false],
                  ["address", "Хаяг", false],
                ] as const
              ).map(([k, label, req]) => (
                <label key={k} className="field" style={{ gridColumn: k === "address" ? "1 / -1" : "auto" }}>
                  <span>
                    {label}
                    {req && <span className="req"> *</span>}
                  </span>
                  <input
                    className="input lg"
                    value={s.store[k]}
                    aria-invalid={!!err[k as keyof Errors]}
                    onChange={(e) => setStore(k, e.target.value)}
                  />
                  {err[k as keyof Errors] && <span className="field-err">{err[k as keyof Errors]}</span>}
                </label>
              ))}
            </div>
          </Panel>
        )}

        {tab === "delivery" && (
          <Panel
            title="Хүргэлтийн бүс & төлбөр"
            clip
            style={{ maxWidth: 960 }}
            action={
              <button
                className="link-btn"
                onClick={() => setS((x) => ({ ...x, zones: [...x.zones, { id: newId("z"), name: "Шинэ бүс", fee: 0, eta: "", active: true }] }))}
              >
                <Plus size={15} />
                Бүс нэмэх
              </button>
            }
          >
            <div className="tbl-scroll">
              <div style={{ minWidth: 620 }}>
                <div className={`tr th ${styles.zoneCols}`}>
                  <span>Бүс</span>
                  <span>Төлбөр (₮)</span>
                  <span>Хугацаа</span>
                  <span>Идэвх</span>
                  <span />
                </div>
                {s.zones.map((z) => (
                  <div key={z.id} className={`tr ${styles.zoneCols}`} style={{ paddingTop: 7, paddingBottom: 7 }}>
                    <input className="input" value={z.name} aria-label="Бүс" onChange={(e) => setZone(z.id, { name: e.target.value })} />
                    <input className="input" type="number" min={0} value={z.fee} aria-label="Төлбөр" onChange={(e) => setZone(z.id, { fee: e.target.value as unknown as number })} />
                    <input className="input" value={z.eta} aria-label="Хугацаа" onChange={(e) => setZone(z.id, { eta: e.target.value })} />
                    <Switch on={z.active} label="Идэвх" onChange={() => setZone(z.id, { active: !z.active })} />
                    <button
                      className="icon-btn danger"
                      aria-label="Устгах"
                      onClick={() =>
                        confirmAction({
                          title: `“${z.name}” бүс устгах уу?`,
                          msg: "Энэ бүсийг хүргэлтийн сонголтоос хасна.",
                          ok: "Устгах",
                          danger: true,
                          onOk: () => {
                            setS((x) => ({ ...x, zones: x.zones.filter((y) => y.id !== z.id) }));
                            toast("Бүс устгагдлаа — хадгалахаа мартуузай", "ok");
                          },
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.free}>
              <span style={{ fontWeight: 500 }}>Үнэгүй хүргэлтийн босго</span>
              <div className="with-unit" style={{ width: 150 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={s.freeOver}
                  aria-label="Үнэгүй хүргэлтийн босго"
                  onChange={(e) => setS((x) => ({ ...x, freeOver: e.target.value as unknown as number }))}
                />
                <span>₮</span>
              </div>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Энэ дүнгээс дээш захиалгад УБ-д хүргэлт үнэгүй
              </span>
            </div>
          </Panel>
        )}

        {tab === "qpay" && <QPayTab s={s} err={err} setQ={setQ} />}

        {tab === "admins" && <AdminsTab db={db} />}
      </div>
    </>
  );
}

function QPayTab({
  s,
  err,
  setQ,
}: {
  s: Settings;
  err: Errors;
  setQ: <K extends keyof Settings["qpay"]>(k: K, v: Settings["qpay"][K]) => void;
}) {
  const q = s.qpay;
  const prod = q.env === "production";
  const [testing, setTesting] = useState(false);
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <Panel
        title="QPay холболт"
        action={<Badge lg dot spec={prod ? { label: "Production", tone: "green" } : { label: "Sandbox", tone: "amber" }} />}
      >
        <div className={styles.grid}>
          {(
            [
              ["username", "Merchant username", "text"],
              ["password", "Merchant password", "password"],
              ["invoiceCode", "Invoice code", "text"],
            ] as const
          ).map(([k, label, type]) => (
            <label key={k} className="field">
              <span>
                {label}
                <span className="req"> *</span>
              </span>
              <input
                className="input lg mono"
                type={type}
                value={q[k]}
                aria-invalid={!!err[k as keyof Errors]}
                onChange={(e) => setQ(k, e.target.value)}
                autoComplete="off"
              />
              {err[k as keyof Errors] && <span className="field-err">{err[k as keyof Errors]}</span>}
            </label>
          ))}
          <label className="field">
            Callback URL
            <input className="input lg mono" readOnly value="https://api.autohub.mn/payments/qpay/callback" style={{ background: "var(--panel2)", color: "var(--muted)", fontSize: 12 }} />
          </label>
        </div>
        <div className={styles.qRow}>
          <span style={{ fontWeight: 500 }}>Орчин</span>
          <Segmented
            className="lg"
            options={[
              ["sandbox", "Sandbox"],
              ["production", "Production"],
            ]}
            value={q.env}
            onChange={(v) => setQ("env", v)}
          />
          <span style={{ flex: 1 }} />
          <button
            className="btn ghost"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              toast(`QPay ${prod ? "production" : "sandbox"} руу холбогдож байна…`, "info");
              const r = await testQPay(q);
              setTesting(false);
              toast(r.message, r.ok ? "ok" : "err");
            }}
          >
            {testing ? <span className="spinner" /> : <Radio size={16} />}
            Холболт шалгах
          </button>
        </div>
        {prod && (
          <div className={styles.warn}>Production горимд бодит төлбөр хийгдэнэ. Merchant мэдээллээ шалгасны дараа хадгална уу.</div>
        )}
      </Panel>
      <div className={`panel ${styles.demo}`}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong className="mono">DEMO_MODE</strong>
            <Badge spec={q.demo ? { label: "Идэвхтэй", tone: "amber" } : { label: "Унтраасан", tone: "neutral" }} />
          </div>
          <span className="muted">
            Идэвхтэй үед QPay руу хүсэлт илгээхгүй, нэхэмжлэх бүр 10 секундын дараа автоматаар “Төлөгдсөн” болно. Зөвхөн туршилтад ашиглана.
          </span>
        </div>
        <Switch
          lg
          on={q.demo}
          label="DEMO_MODE"
          onChange={() => {
            setQ("demo", !q.demo);
            toast(`DEMO_MODE ${q.demo ? "унтарлаа" : "идэвхжлээ"}`, "info");
          }}
        />
      </div>
    </div>
  );
}

function AdminsTab({ db }: { db: Db }) {
  const session = useSession();
  const invite = () =>
    openForm({
      title: "Админ урих",
      desc: "Урилгын холбоос и-мэйлээр илгээгдэнэ.",
      submit: "Урилга илгээх",
      fields: [
        { key: "name", label: "Нэр", required: true },
        { key: "email", label: "И-мэйл", type: "email", required: true },
        { key: "role", label: "Эрх", type: "select", full: true, options: [["operator", "Оператор"], ["admin", "Админ"]] },
      ],
      values: { name: "", email: "", role: "operator" },
      validate: (v) =>
        !/^\S+@\S+\.\S+$/.test(v.email ?? "")
          ? { email: "Зөв и-мэйл оруулна уу" }
          : db.admins.some((a) => a.email.toLowerCase() === v.email!.toLowerCase())
            ? { email: "Энэ и-мэйл бүртгэлтэй байна" }
            : {},
      onSubmit: async (v) => {
        await inviteAdmin(v.name!.trim(), v.email!.trim(), v.role as AdminRole);
        toast(`${v.email} руу урилга илгээлээ`, "ok");
      },
    });

  const roles: { role: AdminRole; icon: typeof ShieldUser; perms: [string, boolean][] }[] = [
    { role: "admin", icon: ShieldUser, perms: [["Бүх хуудас", true], ["Тохиргоо, QPay", true], ["Админ удирдах", true], ["Тайлан экспорт", true]] },
    { role: "operator", icon: Headset, perms: [["Захиалга, төлөв шинэчлэх", true], ["Бараа, нөөц засах", true], ["Тохиргоо, QPay", false], ["Админ удирдах", false]] },
  ];

  return (
    <div className="stack" style={{ maxWidth: 1040 }}>
      <Panel
        title="Админ хэрэглэгчид"
        clip
        action={
          <button className="btn primary sm" onClick={invite}>
            <UserPlus size={15} />
            Урих
          </button>
        }
      >
        <div className="tbl-scroll">
          <div style={{ minWidth: 560 }}>
            <div className={`tr th ${styles.adminCols}`}>
              <span>Хэрэглэгч</span>
              <span>Эрх</span>
              <span>Сүүлд нэвтэрсэн</span>
              <span />
            </div>
            {db.admins.map((a) => {
              const self = a.id === session?.userId;
              return (
                <div key={a.id} className={`tr ${styles.adminCols}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span className="avatar">{initials(a.name)}</span>
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontWeight: 500 }}>
                        {a.name}
                        {self && <span className="faint"> (та)</span>}
                      </span>
                      <span title={a.email} className="faint ellipsis" style={{ fontSize: 11.5 }}>
                        {a.email}
                      </span>
                    </span>
                  </div>
                  <select
                    className="select"
                    value={a.role}
                    disabled={self}
                    aria-label="Эрх"
                    onChange={async (e) => {
                      const role = e.target.value as AdminRole;
                      await setAdminRole(a.id, role);
                      toast(`${a.name} → ${ROLE_LABEL[role]}`, "ok");
                    }}
                  >
                    <option value="admin">Админ</option>
                    <option value="operator">Оператор</option>
                  </select>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {self ? "Одоо идэвхтэй" : a.lastSeen}
                  </span>
                  {!self ? (
                    <button
                      className="icon-btn danger"
                      aria-label="Хасах"
                      onClick={() =>
                        confirmAction({
                          title: `${a.name}-г хасах уу?`,
                          msg: "Энэ хэрэглэгч админ хэсэгт нэвтрэх эрхээ алдана.",
                          ok: "Хасах",
                          danger: true,
                          onOk: async () => {
                            await removeAdmin(a.id);
                            toast("Хэрэглэгч хасагдлаа", "ok");
                          },
                        })
                      }
                    >
                      <UserMinus size={16} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
      <div className={styles.roles}>
        {roles.map((r) => (
          <div key={r.role} className="panel panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <r.icon size={18} style={{ color: "var(--accent)" }} />
              <strong>{ROLE_LABEL[r.role]}</strong>
              <span className="faint" style={{ fontSize: 12 }}>
                {db.admins.filter((a) => a.role === r.role).length} хэрэглэгч
              </span>
            </div>
            {r.perms.map(([t, ok]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: ok ? "var(--text)" : "var(--faint)" }}>
                {ok ? <Check size={15} /> : <Ban size={15} />}
                {t}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
