"use client";

import { ArrowDown, ArrowUp, Image as ImageIcon, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import {
  deleteBanner,
  deleteCampaign,
  moveBanner,
  saveBanner,
  saveCampaign,
  toggleBanner,
  toggleCampaign,
} from "../../../lib/api/marketing";
import { useDb } from "../../../lib/db";
import { shortDate, ubToday } from "../../../lib/format";
import type { BadgeSpec } from "../../../lib/status";
import type { Banner, Campaign, Db } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Panel, Switch } from "../../ui/bits";
import styles from "./Promos.module.css";

export function PromosView() {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Promos db={db} />;
}

function bannerForm(db: Db, b?: Banner) {
  openForm({
    title: b ? "Баннер засах" : "Шинэ баннер",
    fields: [
      { key: "eyebrow", label: "Шошго", placeholder: "Хямдрал −20%" },
      { key: "cta", label: "Товчны текст", placeholder: "Хямдрал үзэх" },
      { key: "title", label: "Гарчиг", required: true, full: true },
      { key: "sub", label: "Дэд текст", full: true },
      { key: "link", label: "Холбоос", required: true, placeholder: "/shop/brake" },
      { key: "order", label: "Дараалал", type: "number", required: true },
    ],
    values: b
      ? { eyebrow: b.eyebrow, cta: b.cta, title: b.title, sub: b.sub, link: b.link, order: String(b.order) }
      : { eyebrow: "", cta: "", title: "", sub: "", link: "", order: String(Math.max(0, ...db.banners.map((x) => x.order)) + 1) },
    validate: (v) => (v.link!.startsWith("/") || v.link!.startsWith("http") ? {} : { link: "“/” эсвэл “http”-ээр эхлэх ёстой" }),
    onSubmit: async (v) => {
      await saveBanner(
        {
          eyebrow: v.eyebrow!.trim(),
          cta: v.cta!.trim(),
          title: v.title!.trim(),
          sub: v.sub!.trim(),
          link: v.link!.trim(),
          order: +v.order!,
          active: b?.active ?? true,
        },
        b?.id,
      );
      toast(`Баннер ${b ? "шинэчлэгдлээ" : "нэмэгдлээ"}`, "ok");
    },
  });
}

function campaignForm(db: Db, c?: Campaign) {
  openForm({
    title: c ? "Хямдрал засах" : "Шинэ хямдрал",
    fields: [
      { key: "name", label: "Нэр", required: true, full: true },
      { key: "pct", label: "Хувь (%)", type: "number", required: true },
      {
        key: "target",
        label: "Хамрах хүрээ",
        type: "select",
        options: ["Бүх бараа", ...db.categories.map((x) => `Ангилал: ${x.name}`), ...db.brands.map((x) => `Брэнд: ${x.name}`)],
      },
      { key: "from", label: "Эхлэх", type: "date", required: true },
      { key: "to", label: "Дуусах", type: "date", required: true },
    ],
    values: c
      ? { name: c.name, pct: String(c.pct), target: c.target, from: c.from, to: c.to }
      : { name: "", pct: "", target: "Бүх бараа", from: ubToday(), to: "" },
    validate: (v) =>
      !(+v.pct! > 0 && +v.pct! <= 90) ? { pct: "1–90 хооронд" } : v.to! < v.from! ? { to: "Дуусах огноо эхлэхээс хойш" } : {},
    onSubmit: async (v) => {
      await saveCampaign({ name: v.name!.trim(), pct: +v.pct!, target: v.target!, from: v.from!, to: v.to!, active: c?.active ?? true }, c?.id);
      toast(`“${v.name}” хямдрал ${c ? "шинэчлэгдлээ" : "нэмэгдлээ"}`, "ok");
    },
  });
}

const campaignState = (c: Campaign, today = ubToday()): BadgeSpec =>
  !c.active
    ? { label: "Зогсоосон", tone: "neutral" }
    : c.to < today
      ? { label: "Дууссан", tone: "neutral" }
      : c.from > today
        ? { label: "Төлөвлөсөн", tone: "blue" }
        : { label: "Идэвхтэй", tone: "green" };

const remove = (title: string, run: () => Promise<void>) =>
  confirmAction({
    title: `“${title}” устгах уу?`,
    msg: "Энэ үйлдлийг буцаах боломжгүй.",
    ok: "Устгах",
    danger: true,
    onOk: async () => {
      await run();
      toast(`“${title}” устгагдлаа`, "ok");
    },
  });

function Promos({ db }: { db: Db }) {
  const banners = [...db.banners].sort((a, b) => a.order - b.order);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Баннер & Хямдрал" }]}
        title="Баннер & Хямдрал"
        sub="Нүүр хуудасны баннер болон хямдралын кампанит ажил"
        actions={
          <>
            <button className="btn" onClick={() => campaignForm(db)}>
              <Percent size={17} />
              Хямдрал нэмэх
            </button>
            <button className="btn primary" onClick={() => bannerForm(db)}>
              <Plus size={17} />
              Баннер нэмэх
            </button>
          </>
        }
      />
      <div className="stack">
        <Panel title="Нүүр хуудасны баннер" sub="Дарааллаар харагдана">
          <div className={styles.banners}>
            {banners.map((b, i) => (
              <div key={b.id} className={styles.banner} style={{ opacity: b.active ? 1 : 0.6 }}>
                <div className={styles.bannerImg}>
                  <ImageIcon size={30} strokeWidth={1.4} />
                  <span className={styles.order}>{b.order}</span>
                </div>
                <div className={styles.bannerBody}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {b.eyebrow && (
                      <span className="faint" style={{ fontSize: 11.5 }}>
                        {b.eyebrow}
                      </span>
                    )}
                    <strong>{b.title}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {b.sub}
                    </span>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--accent)" }}>
                      {b.cta ? `${b.cta} → ` : ""}
                      {b.link}
                    </span>
                  </div>
                  <div className={styles.bannerActions}>
                    <Switch
                      on={b.active}
                      label="Идэвхтэй"
                      onChange={async () => {
                        await toggleBanner(b.id);
                        toast(`Баннер ${b.active ? "нуугдлаа" : "идэвхжлээ"}`, "ok");
                      }}
                    />
                    <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>
                      {b.active ? "Идэвхтэй" : "Нуусан"}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button className="icon-btn" title="Дээш" aria-label="Дээш" disabled={i === 0} onClick={() => moveBanner(b.id, -1)}>
                      <ArrowUp size={16} />
                    </button>
                    <button className="icon-btn" title="Доош" aria-label="Доош" disabled={i === banners.length - 1} onClick={() => moveBanner(b.id, 1)}>
                      <ArrowDown size={16} />
                    </button>
                    <button className="icon-btn" aria-label="Засах" onClick={() => bannerForm(db, b)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" aria-label="Устгах" onClick={() => remove(b.title, () => deleteBanner(b.id))}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Хямдралын кампанит ажил"
          clip
          action={
            <button className="link-btn" onClick={() => campaignForm(db)}>
              <Plus size={15} />
              Нэмэх
            </button>
          }
        >
          <div className="tbl-scroll">
            <div style={{ minWidth: 860 }}>
              <div className={`tr th ${styles.cols}`}>
                <span>Нэр</span>
                <span className="right">Хувь</span>
                <span>Хамрах хүрээ</span>
                <span>Хугацаа</span>
                <span>Төлөв</span>
                <span>Идэвх</span>
                <span />
              </div>
              {db.campaigns.map((c) => (
                <div key={c.id} className={`tr hover ${styles.cols}`}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span className="right" style={{ fontWeight: 700, color: "var(--accent)" }}>
                    −{c.pct}%
                  </span>
                  <span className="muted">{c.target}</span>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {shortDate(c.from)} – {shortDate(c.to)}
                  </span>
                  <span>
                    <Badge spec={campaignState(c)} dot />
                  </span>
                  <span>
                    <Switch
                      on={c.active}
                      label="Идэвх"
                      onChange={async () => {
                        await toggleCampaign(c.id);
                        toast(`“${c.name}” ${c.active ? "зогслоо" : "идэвхжлээ"}`, "ok");
                      }}
                    />
                  </span>
                  <span className="cell-actions">
                    <button className="icon-btn" aria-label="Засах" onClick={() => campaignForm(db, c)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" aria-label="Устгах" onClick={() => remove(c.name, () => deleteCampaign(c.id))}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              ))}
              {!db.campaigns.length && <div className="empty sm">Хямдрал үүсгээгүй байна.</div>}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
