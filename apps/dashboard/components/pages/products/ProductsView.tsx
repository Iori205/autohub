"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, EyeOff, Package, Pencil, Plus, Tag, Trash2, Warehouse } from "lucide-react";
import { useState } from "react";
import {
  bulkPrice,
  bulkStock,
  deleteProducts,
  setProductsActive,
  type PriceMode,
} from "../../../lib/api/products";
import { downloadCsv } from "../../../lib/csv";
import { useDb } from "../../../lib/db";
import { money } from "../../../lib/format";
import { STOCK_COLOR, stockLevel, typeBadge } from "../../../lib/status";
import type { Db, Product } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, Empty, SearchInput, Switch, Thumb } from "../../ui/bits";
import styles from "./Products.module.css";

export function ProductsView() {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Products db={db} />;
}

export function confirmDelete(products: Product[], after?: () => void) {
  confirmAction({
    title: products.length > 1 ? `${products.length} бараа устгах уу?` : `“${products[0]?.name}” устгах уу?`,
    msg: "Бараа дэлгүүрээс бүрмөсөн устана. Өмнөх захиалгын түүхэд хадгалагдана.",
    ok: "Устгах",
    danger: true,
    onOk: async () => {
      await deleteProducts(products.map((p) => p.id));
      toast(`${products.length} бараа устгагдлаа`, "ok");
      after?.();
    },
  });
}

function Products({ db }: { db: Db }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [cat, setCat] = useState("all");
  const [type, setType] = useState("all");
  const [stock, setStock] = useState("all");
  const [sel, setSel] = useState<Set<number>>(new Set());

  const catName = new Map(db.categories.map((c) => [c.key, c.name]));
  const q = search.trim().toLowerCase();
  const list = db.products.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || p.oem.some((x) => x.toLowerCase().includes(q))) &&
      (brand === "all" || p.brand === brand) &&
      (cat === "all" || p.category === cat) &&
      (type === "all" || (type === "orig") === p.genuine) &&
      (stock === "all" || stockLevel(p) === stock),
  );
  const ids = [...sel];
  const allSel = list.length > 0 && list.every((p) => sel.has(p.id));
  const clear = () => setSel(new Set());
  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulk = [
    {
      label: "Үнэ засах",
      icon: Tag,
      run: () =>
        openForm({
          title: "Үнэ бөөнөөр засах",
          desc: `${ids.length} бараанд хэрэгжинэ`,
          submit: "Хэрэгжүүлэх",
          fields: [
            { key: "mode", label: "Арга", type: "select", options: [["up", "Хувиар нэмэх (+%)"], ["down", "Хувиар хасах (−%)"], ["fixed", "Тогтмол үнэ (₮)"]] },
            { key: "val", label: "Утга", type: "number", required: true, placeholder: "10" },
          ],
          values: { mode: "up", val: "" },
          validate: (v) => (Number(v.val) > 0 ? {} : { val: "0-ээс их тоо оруулна уу" }),
          onSubmit: async (v) => {
            await bulkPrice(ids, v.mode as PriceMode, Number(v.val));
            clear();
            toast(`${ids.length} бараа шинэчлэгдлээ`, "ok");
          },
        }),
    },
    {
      label: "Нөөц засах",
      icon: Warehouse,
      run: () =>
        openForm({
          title: "Нөөц бөөнөөр засах",
          desc: `${ids.length} бараанд хэрэгжинэ`,
          submit: "Хэрэгжүүлэх",
          fields: [
            { key: "mode", label: "Арга", type: "select", options: [["add", "Нөөц нэмэх (+)"], ["set", "Нөөц тогтоох (=)"]] },
            { key: "val", label: "Тоо ширхэг", type: "number", required: true, placeholder: "20" },
          ],
          values: { mode: "add", val: "" },
          validate: (v) => (Number(v.val) >= 0 ? {} : { val: "0 эсвэл түүнээс их" }),
          onSubmit: async (v) => {
            await bulkStock(ids, v.mode as "add" | "set", Number(v.val));
            clear();
            toast(`${ids.length} бараа шинэчлэгдлээ`, "ok");
          },
        }),
    },
    {
      label: "Идэвхжүүлэх",
      icon: Eye,
      run: async () => {
        await setProductsActive(ids, true);
        clear();
        toast(`${ids.length} бараа идэвхжлээ`, "ok");
      },
    },
    {
      label: "Нуух",
      icon: EyeOff,
      run: async () => {
        await setProductsActive(ids, false);
        clear();
        toast(`${ids.length} бараа нуугдлаа`, "ok");
      },
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Бараа" }]}
        title="Бараа"
        sub={`${db.products.length} бараа · ${db.products.filter((p) => p.active).length} идэвхтэй`}
        actions={
          <>
            <button
              className="btn"
              onClick={() =>
                downloadCsv("autohub-products.csv", [
                  ["ID", "Нэр", "Брэнд", "Ангилал", "OEM", "Үнэ", "Нөөц", "Төрөл"],
                  ...db.products.map((p) => [p.id, p.name, p.brand, catName.get(p.category), p.oem.join(" "), p.price, p.stock, typeBadge(p.genuine).label]),
                ])
              }
            >
              <Download size={17} />
              CSV экспорт
            </button>
            <Link href="/products/new" className="btn primary">
              <Plus size={17} />
              Бараа нэмэх
            </Link>
          </>
        }
      />
      <div className="panel clip">
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Нэр эсвэл OEM дугаар" />
          <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Брэнд">
            <option value="all">Брэнд: Бүгд</option>
            {db.brands.map((b) => (
              <option key={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Ангилал">
            <option value="all">Ангилал: Бүгд</option>
            {db.categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Төрөл">
            <option value="all">Төрөл: Бүгд</option>
            <option value="orig">Оригинал</option>
            <option value="analog">Аналог</option>
          </select>
          <select className="select" value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Нөөц">
            <option value="all">Нөөц: Бүгд</option>
            <option value="ok">Нөөцтэй</option>
            <option value="low">Дуусах дөхсөн</option>
            <option value="out">Дууссан</option>
          </select>
          <span className="count">
            {list.length} / {db.products.length} бараа
          </span>
        </div>
        {sel.size > 0 && (
          <div className="bulkbar">
            <strong>{sel.size} бараа сонгосон</strong>
            {bulk.map((b) => (
              <button key={b.label} className="btn sm" onClick={b.run}>
                <b.icon size={15} />
                {b.label}
              </button>
            ))}
            <button className="btn sm text-danger" onClick={() => confirmDelete(db.products.filter((p) => sel.has(p.id)), clear)}>
              <Trash2 size={15} />
              Устгах
            </button>
            <button className="btn plain sm end" onClick={clear}>
              Болих
            </button>
          </div>
        )}
        <div className="tbl-scroll">
          <div className={styles.table}>
            <div className={`tr th ${styles.cols}`}>
              <input
                type="checkbox"
                checked={allSel}
                aria-label="Бүгдийг сонгох"
                onChange={() => setSel(allSel ? new Set() : new Set(list.map((p) => p.id)))}
              />
              <span>Бараа</span>
              <span>Брэнд</span>
              <span className="hide-narrow">Ангилал</span>
              <span>OEM</span>
              <span className="right">Үнэ</span>
              <span className="right">Нөөц</span>
              <span className="hide-narrow">Төрөл</span>
              <span>Идэвхтэй</span>
              <span />
            </div>
            {list.map((p) => (
              <div
                key={p.id}
                className={`tr click ${styles.cols}`}
                data-selected={sel.has(p.id)}
                onClick={() => router.push(`/products/${p.id}`)}
              >
                <input
                  type="checkbox"
                  checked={sel.has(p.id)}
                  aria-label={`${p.name} сонгох`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(p.id)}
                />
                <div className={styles.prod} style={{ opacity: p.active ? 1 : 0.5 }}>
                  <Thumb product={p} categories={db.categories} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span title={p.name} className="ellipsis" style={{ fontWeight: 500 }}>
                      {p.name}
                    </span>
                    <span className="faint" style={{ fontSize: 11.5 }}>
                      ID {p.id} · {p.fits.length ? `${p.fits.length} машин` : catName.get(p.category)}
                    </span>
                  </span>
                </div>
                <span title={p.brand} className="ellipsis">{p.brand}</span>
                <span title={catName.get(p.category)} className="muted ellipsis hide-narrow">{catName.get(p.category)}</span>
                <span className={`mono ${styles.oem}`}>
                  <span title={p.oem.join(", ")} className="ellipsis">{p.oem[0]}</span>
                  {p.oem.length > 1 && <span className={styles.more}>+{p.oem.length - 1}</span>}
                </span>
                <span className={styles.price}>
                  <span className="strong">{money(p.price)}</span>
                  {p.oldPrice && <span className={styles.old}>{money(p.oldPrice)}</span>}
                </span>
                <span className="right strong" style={{ color: STOCK_COLOR[stockLevel(p)] }}>
                  {p.stock}
                </span>
                <span className="hide-narrow">
                  <Badge spec={typeBadge(p.genuine)} />
                </span>
                <span>
                  <Switch
                    on={p.active}
                    label="Идэвхтэй"
                    onChange={async () => {
                      await setProductsActive([p.id], !p.active);
                      toast(`“${p.name}” ${p.active ? "нуугдлаа" : "идэвхжлээ"}`, "ok");
                    }}
                  />
                </span>
                <span className="cell-actions" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/products/${p.id}`} className="icon-btn" title="Засах" aria-label="Засах">
                    <Pencil size={16} />
                  </Link>
                  <button className="icon-btn danger" title="Устгах" aria-label="Устгах" onClick={() => confirmDelete([p])}>
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
            {!list.length && (
              <Empty
                icon={Package}
                title="Бараа олдсонгүй"
                text="Шүүлтүүрт тохирох бараа алга. Шинэ бараа нэмэх эсвэл шүүлтүүрээ өөрчилнө үү."
                action={
                  <button
                    className="btn md ghost"
                    onClick={() => {
                      setSearch("");
                      setBrand("all");
                      setCat("all");
                      setType("all");
                      setStock("all");
                    }}
                  >
                    Шүүлтүүр арилгах
                  </button>
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
