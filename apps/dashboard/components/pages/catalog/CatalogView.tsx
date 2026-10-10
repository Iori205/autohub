"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBrand, deleteCategory, saveBrand, saveCategory } from "../../../lib/api/catalog";
import { useDb } from "../../../lib/db";
import type { Brand, BrandKind, Category, Db, IconKey } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { CATEGORY_ICONS, ICON_KEYS } from "../../icons";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Panel } from "../../ui/bits";
import styles from "./Catalog.module.css";

const KIND_LABEL: Record<BrandKind, string> = { oem: "Оригинал (OEM)", aftermarket: "Аналог" };

export function CatalogView() {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Catalog db={db} />;
}

function categoryForm(db: Db, c?: Category) {
  openForm({
    title: c ? "Ангилал засах" : "Шинэ ангилал",
    fields: [
      { key: "name", label: "Нэр", required: true, placeholder: "жишээ: Тоормос" },
      { key: "key", label: "Slug (URL)", required: true, placeholder: "brake" },
      { key: "icon", label: "Дүрс тэмдэг", type: "select", full: true, options: ICON_KEYS },
    ],
    values: c ? { name: c.name, key: c.key, icon: c.icon } : { name: "", key: "", icon: "package" },
    validate: (v) => ({
      name: db.categories.some((x) => x.name === v.name && x.key !== c?.key) ? "Ийм нэртэй ангилал байна" : undefined,
      key: !/^[a-z0-9-]+$/.test(v.key ?? "")
        ? "Зөвхөн латин жижиг үсэг, тоо, зураас"
        : db.categories.some((x) => x.key === v.key && x.key !== c?.key)
          ? "Энэ slug ашиглагдаж байна"
          : undefined,
    }),
    onSubmit: async (v) => {
      await saveCategory({ name: v.name!.trim(), key: v.key!, icon: v.icon as IconKey }, c?.key);
      toast(`“${v.name}” ангилал ${c ? "шинэчлэгдлээ" : "нэмэгдлээ"}`, "ok");
    },
  });
}

function brandForm(b?: Brand) {
  openForm({
    title: b ? "Брэнд засах" : "Шинэ брэнд",
    fields: [
      { key: "name", label: "Нэр", required: true, placeholder: "жишээ: Aisin" },
      { key: "country", label: "Улс", required: true, placeholder: "Япон" },
      { key: "kind", label: "Төрөл", type: "select", full: true, options: Object.entries(KIND_LABEL) as [string, string][] },
    ],
    values: b ? { name: b.name, country: b.country, kind: b.kind } : { name: "", country: "", kind: "aftermarket" },
    onSubmit: async (v) => {
      await saveBrand({ name: v.name!.trim(), country: v.country!.trim(), kind: v.kind as BrandKind }, b?.id);
      toast(`“${v.name}” брэнд ${b ? "шинэчлэгдлээ" : "нэмэгдлээ"}`, "ok");
    },
  });
}

function Catalog({ db }: { db: Db }) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ангилал & Брэнд" }]}
        title="Ангилал & Брэнд"
        sub={`${db.categories.length} ангилал · ${db.brands.length} брэнд`}
        actions={
          <>
            <button className="btn" onClick={() => brandForm()}>
              <Plus size={17} />
              Брэнд нэмэх
            </button>
            <button className="btn primary" onClick={() => categoryForm(db)}>
              <Plus size={17} />
              Ангилал нэмэх
            </button>
          </>
        }
      />
      <div className="row-wrap">
        <Panel
          title="Ангилал"
          sub={`${db.categories.length} ангилал`}
          clip
          style={{ flex: "1 1 440px" }}
          action={
            <button className="link-btn" onClick={() => categoryForm(db)}>
              <Plus size={15} />
              Нэмэх
            </button>
          }
        >
          <div className="tbl-scroll">
            <div style={{ minWidth: 420 }}>
              <div className={`tr th ${styles.catCols}`}>
                <span />
                <span>Нэр</span>
                <span>Slug</span>
                <span className="right">Бараа</span>
                <span />
              </div>
              {db.categories.map((c) => {
                const n = db.products.filter((p) => p.category === c.key).length;
                const Icon = CATEGORY_ICONS[c.icon];
                return (
                  <div key={c.key} className={`tr hover ${styles.catCols}`}>
                    <span className="icon-tile">
                      <Icon size={17} />
                    </span>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span className="mono muted" style={{ fontSize: 12 }}>
                      /{c.key}
                    </span>
                    <span className="right strong">{n}</span>
                    <span className="cell-actions">
                      <button className="icon-btn" aria-label="Засах" onClick={() => categoryForm(db, c)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label="Устгах"
                        onClick={() =>
                          n
                            ? toast(`“${c.name}” ангилалд ${n} бараа байгаа тул устгах боломжгүй`, "err")
                            : confirmAction({
                                title: `“${c.name}” устгах уу?`,
                                msg: "Энэ үйлдлийг буцаах боломжгүй.",
                                ok: "Устгах",
                                danger: true,
                                onOk: async () => {
                                  await deleteCategory(c.key);
                                  toast(`“${c.name}” устгагдлаа`, "ok");
                                },
                              })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
        <Panel
          title="Брэнд"
          sub={`${db.brands.length} брэнд`}
          clip
          style={{ flex: "1 1 440px" }}
          action={
            <button className="link-btn" onClick={() => brandForm()}>
              <Plus size={15} />
              Нэмэх
            </button>
          }
        >
          <div className="tbl-scroll">
            <div style={{ minWidth: 460 }}>
              <div className={`tr th ${styles.brandCols}`}>
                <span />
                <span>Нэр</span>
                <span>Улс</span>
                <span>Төрөл</span>
                <span className="right">Бараа</span>
                <span />
              </div>
              {db.brands.map((b) => {
                const n = db.products.filter((p) => p.brand === b.name).length;
                return (
                  <div key={b.id} className={`tr hover ${styles.brandCols}`}>
                    <span className={styles.brandMark}>{b.name.slice(0, 3).toUpperCase()}</span>
                    <span style={{ fontWeight: 500 }}>{b.name}</span>
                    <span className="muted">{b.country}</span>
                    <span>
                      <Badge spec={b.kind === "oem" ? { label: "Оригинал", tone: "blue" } : { label: "Аналог", tone: "neutral" }} />
                    </span>
                    <span className="right strong">{n}</span>
                    <span className="cell-actions">
                      <button className="icon-btn" aria-label="Засах" onClick={() => brandForm(b)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label="Устгах"
                        onClick={() =>
                          confirmAction({
                            title: `“${b.name}” устгах уу?`,
                            msg: n ? `${n} бараа энэ брэндтэй холбоотой. Бараанууд брэндгүй үлдэнэ.` : "Энэ үйлдлийг буцаах боломжгүй.",
                            ok: "Устгах",
                            danger: true,
                            onOk: async () => {
                              await deleteBrand(b.id);
                              toast(`“${b.name}” устгагдлаа`, "ok");
                            },
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
