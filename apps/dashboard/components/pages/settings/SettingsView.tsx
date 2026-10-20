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
import type { SettingsTab } from "../../../lib/settings-tabs";
import type { AdminRole, Db, Settings } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Panel, Switch } from "../../ui/bits";
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

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

const zoneId = () => `z${Date.now().toString(36)}`;

function SettingsForm({ db, tab }: { db: Db; tab: SettingsTab }) {
  const router = useRouter();
  const session = useSession();
  // оператор харж болно, өөрчилж болохгүй (сервис ч 403 буцаана)
  const readOnly = session?.role !== "admin";
  // Засвар «Хадгалах» дартал зөвхөн энд үлдэнэ; админы өөрчлөлт шууд хэрэгжинэ.
  const [s, setS] = useState<Settings>(() => structuredClone(db.settings));
  const [err, setErr] = useState<Errors>({});
  const dirty = JSON.stringify(s) !== JSON.stringify(db.settings);

  const setStore = (k: keyof Settings["store"], v: string) => {
    setS((x) => ({ ...x, store: { ...x.store, [k]: v } }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };
  const setZone = (id: string, patch: Partial<Settings["zones"][number]>) =>
    setS((x) => ({ ...x, zones: x.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));

  const save = async () => {
    const e: Errors = {};
    if (!s.store.name.trim()) e.name = "Нэр оруулна уу";
    if (!/^\d{4}-?\d{4}$/.test(s.store.phone.trim())) e.phone = "8 оронтой утасны дугаар (жишээ: 7711-2233)";
    if (s.store.email.trim() && !/^\S+@\S+\.\S+$/.test(s.store.email.trim())) e.email = "Зөв и-мэйл хаяг оруулна уу";
    setErr(e);
    if (Object.keys(e).length) return toast("Тохиргоонд алдаа байна", "err");
    try {
      await saveSettings({ ...s, freeOver: Number(s.freeOver) || 0, zones: s.zones.map((z) => ({ ...z, fee: Number(z.fee) || 0 })) });
    } catch (x) {
      // серверийн талбарын алдаа (жишээ нь «phone») харгалзах оролтын доор гарна
      const fields = (x as { fields?: Record<string, string> }).fields;
      if (fields) setErr(fields as Errors);
      throw x;
    }
    toast("Тохиргоо хадгалагдлаа", "ok");
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Тохиргоо" }]}
        title="Тохиргоо"
        sub="Дэлгүүр, хүргэлт, төлбөр болон админ хэрэглэгчид"
        actions={
          !readOnly &&
          (tab === "store" || tab === "delivery") && (
            <button className="btn primary" onClick={save}>
              <Check size={17} />
              Хадгалах{dirty ? " •" : ""}
            </button>
          )
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

        {readOnly && (
          <div className={styles.warn} style={{ maxWidth: 820 }}>
            Оператор эрхээр тохиргоог зөвхөн харах боломжтой. Өөрчлөхийн тулд админ эрхтэй хэрэглэгчээр нэвтэрнэ үү.
          </div>
        )}

        {tab === "store" && (
          <Panel title="Дэлгүүрийн мэдээлэл" style={{ maxWidth: 820 }}>
            <fieldset disabled={readOnly} className={styles.grid} style={{ border: 0, margin: 0, minWidth: 0 }}>
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
                    <span>{label}</span>
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
            </fieldset>
          </Panel>
        )}

        {tab === "delivery" && (
          <Panel
            title="Хүргэлтийн бүс & төлбөр"
            clip
            style={{ maxWidth: 960 }}
            action={
              !readOnly && (
                <button
                  className="link-btn"
                  onClick={() => setS((x) => ({ ...x, zones: [...x.zones, { id: zoneId(), name: "Шинэ бүс", fee: 0, eta: "", active: true }] }))}
                >
                  <Plus size={15} />
                  Бүс нэмэх
                </button>
              )
            }
          >
            <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
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
            </fieldset>
          </Panel>
        )}

        {tab === "qpay" && <QPayTab q={db.settings.qpay} readOnly={readOnly} />}

        {tab === "admins" && <AdminsTab db={db} readOnly={readOnly} />}
      </div>
    </>
  );
}

/** Зөвхөн унших: нэвтрэх мэдээлэл, орчин, DEMO_MODE-ийг сервисийн .env-д тохируулна. */
function QPayTab({ q, readOnly }: { q: Settings["qpay"]; readOnly: boolean }) {
  const prod = q.env === "production";
  const [testing, setTesting] = useState(false);
  const rows: [string, string][] = [
    ["Merchant", q.merchantConfigured ? "Тохируулсан (QPAY_USERNAME, QPAY_PASSWORD)" : "Тохируулаагүй"],
    ["Invoice code", q.invoiceCode || "—"],
    ["Callback URL", q.callbackUrl],
  ];
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <Panel
        title="QPay холболт"
        action={<Badge lg dot spec={prod ? { label: "Production", tone: "green" } : { label: "Sandbox", tone: "amber" }} />}
      >
        <div className={styles.grid}>
          {rows.map(([label, value]) => (
            <label key={label} className="field" style={{ gridColumn: label === "Callback URL" ? "1 / -1" : "auto" }}>
              {label}
              <input className="input lg mono" readOnly value={value} style={{ background: "var(--panel2)", color: "var(--muted)", fontSize: 12 }} />
            </label>
          ))}
        </div>
        <div className={styles.qRow}>
          <span className="muted" style={{ fontSize: 12.5, flex: 1 }}>
            Merchant мэдээлэл, орчин (QPAY_BASE_URL) серверийн <span className="mono">.env</span> файлд хадгалагдана — нууц үг энд
            харагдахгүй.
          </span>
          {!readOnly && (
            <button
              className="btn ghost"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                toast(`QPay ${prod ? "production" : "sandbox"} руу холбогдож байна…`, "info");
                try {
                  const r = await testQPay();
                  toast(r.message, r.ok ? "ok" : "err");
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? <span className="spinner" /> : <Radio size={16} />}
              <span>Холболт шалгах</span>
            </button>
          )}
        </div>
        {prod && <div className={styles.warn}>Production горимд бодит төлбөр хийгдэнэ.</div>}
      </Panel>
      <div className={`panel ${styles.demo}`}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong className="mono">DEMO_MODE</strong>
            <Badge spec={q.demo ? { label: "Идэвхтэй", tone: "amber" } : { label: "Унтраасан", tone: "neutral" }} />
          </div>
          <span className="muted">
            Идэвхтэй үед QPay руу хүсэлт илгээхгүй: нэхэмжлэх, QR код дотооддоо үүснэ. Төлбөрийн цонхон дээрх DEMO товчоор “Төлсөн”,
            “Хугацаа дууссан”, “Сүлжээний алдаа” төлөвийг туршина. Нэхэмжлэх 15 минутын дараа хүчингүй болно. Серверийн{" "}
            <span className="mono">.env</span> файлд <span className="mono">DEMO_MODE=true</span> гэж тохируулна — зөвхөн туршилт,
            танилцуулгад ашиглана.
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminsTab({ db, readOnly }: { db: Db; readOnly: boolean }) {
  const session = useSession();
  const invite = () =>
    openForm({
      title: "Админ урих",
      desc: "Түр нууц үг үүснэ — хэрэглэгчид өөрөө дамжуулна уу (и-мэйл илгээх холбогдоогүй).",
      submit: "Бүртгэх",
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
        const temp = await inviteAdmin(v.name!.trim(), v.email!.trim(), v.role as AdminRole);
        toast(`${v.name} бүртгэгдлээ`, "ok");
        // нэг л удаа харагдана; onSubmit-ийн дараа маягт хаагдаж, энэ цонх үлдэнэ
        setTimeout(
          () =>
            confirmAction({
              title: "Түр нууц үг",
              msg: `${v.email!.trim()} · нууц үг: ${temp} — Үүнийг хэрэглэгчид дамжуулна уу. Дахин харагдахгүй.`,
              ok: "Ойлголоо",
              onOk: () => undefined,
            }),
          0,
        );
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
          !readOnly && (
            <button className="btn primary sm" onClick={invite}>
              <UserPlus size={15} />
              Урих
            </button>
          )
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
                        <span>{a.name}</span>
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
                    disabled={self || readOnly}
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
                  {!self && !readOnly ? (
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
                <span>{t}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
