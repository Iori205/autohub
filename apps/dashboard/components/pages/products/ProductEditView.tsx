"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CloudUpload, Minus, Package, Plus, Trash2, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { saveProduct } from "../../../lib/api/products";
import { useDb } from "../../../lib/db";
import type { Db, Fitment, Product, Spec } from "../../../lib/types";
import { toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Empty, Panel, Segmented, Switch } from "../../ui/bits";
import { confirmDelete } from "./ProductsView";
import styles from "./Products.module.css";

const MAX_IMAGES = 8;

export function ProductEditView({ id }: { id?: number }) {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  const product = id ? db.products.find((p) => p.id === id) : undefined;
  if (id && !product)
    return (
      <>
        <PageHeader crumbs={[{ label: "Бараа", href: "/products" }, { label: "Засах" }]} title="Бараа засах" />
        <div className="panel">
          <Empty
            icon={Package}
            title="Бараа олдсонгүй"
            text={`ID ${id} бараа байхгүй эсвэл устгагдсан байна.`}
            action={
              <Link href="/products" className="btn md ghost">
                Бараа руу буцах
              </Link>
            }
          />
        </div>
      </>
    );
  // key: a different product (or "new") starts with a fresh form
  return <ProductForm key={id ?? "new"} db={db} product={product} />;
}

interface Draft {
  name: string;
  description: string;
  brand: string;
  category: string;
  genuine: boolean;
  oem: string[];
  oemIn: string;
  price: string;
  oldPrice: string;
  stock: string;
  threshold: string;
  active: boolean;
  specs: Spec[];
  fits: (Fitment & { sel?: boolean })[];
  images: string[];
}

const toDraft = (p: Product | undefined, db: Db): Draft =>
  p
    ? {
        name: p.name,
        description: p.description,
        brand: p.brand,
        category: p.category,
        genuine: p.genuine,
        oem: [...p.oem],
        oemIn: "",
        price: String(p.price),
        oldPrice: p.oldPrice ? String(p.oldPrice) : "",
        stock: String(p.stock),
        threshold: String(p.threshold),
        active: p.active,
        specs: p.specs.length ? p.specs.map((s) => ({ ...s })) : [{ k: "", v: "" }],
        fits: p.fits.map((f) => ({ ...f })),
        images: [...p.images],
      }
    : {
        name: "",
        description: "",
        brand: db.brands[0]?.name ?? "",
        category: db.categories[0]?.key ?? "",
        genuine: true,
        oem: [],
        oemIn: "",
        price: "",
        oldPrice: "",
        stock: "",
        threshold: "3",
        active: true,
        specs: [{ k: "", v: "" }],
        fits: [],
        images: [],
      };

type Errors = Partial<Record<"name" | "price" | "oldPrice" | "stock" | "oem", string>>;

function ProductForm({ db, product }: { db: Db; product?: Product }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => toDraft(product, db));
  const [err, setErr] = useState<Errors>({});
  const [drag, setDrag] = useState(false);
  const [pick, setPick] = useState({ make: "", model: "", year: "", engine: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Draft>, clear?: keyof Errors) => {
    setD((x) => ({ ...x, ...patch }));
    if (clear) setErr((e) => ({ ...e, [clear]: undefined }));
  };

  /* images */
  const addFiles = (files: FileList | null) => {
    [...(files ?? [])]
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES)
      .forEach((f) => {
        if (f.size > 5 * 1024 * 1024) return toast(`${f.name}: 5MB-аас их байна`, "err");
        void shrinkImage(f)
          .then((url) => setD((x) => ({ ...x, images: [...x.images, url].slice(0, MAX_IMAGES) })))
          .catch(() => toast(`${f.name}: зургийг уншиж чадсангүй`, "err"));
      });
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  /* OEM chips */
  const addOem = () => {
    const v = d.oemIn.trim().toUpperCase().replace(/,$/, "");
    if (!v) return;
    if (d.oem.includes(v)) return set({ oemIn: "" });
    set({ oem: [...d.oem, v], oemIn: "" }, "oem");
  };

  /* fitment picker: make → model → year → engine */
  const V = db.vehicles;
  const uniq = <T,>(a: T[]) => [...new Set(a)];
  const makes = uniq(V.map((v) => v.make));
  const models = pick.make ? uniq(V.filter((v) => v.make === pick.make).map((v) => v.model)) : [];
  const vm = V.filter((v) => v.make === pick.make && v.model === pick.model);
  const yMax = vm.length ? Math.max(...vm.map((v) => v.yearTo)) : 0;
  const yMin = vm.length ? Math.min(...vm.map((v) => v.yearFrom)) : 0;
  const years = vm.length ? Array.from({ length: yMax - yMin + 1 }, (_, i) => String(yMax - i)) : [];
  const engines = pick.year
    ? uniq(vm.filter((v) => v.yearFrom <= +pick.year && v.yearTo >= +pick.year).map((v) => v.engine))
    : [];
  const setPickKey = (k: keyof typeof pick, val: string) => {
    const order: (keyof typeof pick)[] = ["make", "model", "year", "engine"];
    const n = { ...pick, [k]: val };
    order.slice(order.indexOf(k) + 1).forEach((z) => (n[z] = ""));
    setPick(n);
  };
  const addFit = () => {
    if (!pick.make || !pick.model || !pick.year) return toast("Үйлдвэрлэгч, загвар, оноо сонгоно уу", "err");
    const add = (pick.engine ? [pick.engine] : engines)
      .map((engine) => ({ make: pick.make, model: pick.model, years: pick.year, engine }))
      .filter((n) => !d.fits.some((x) => x.make === n.make && x.model === n.model && x.years === n.years && x.engine === n.engine));
    if (!add.length) return toast("Энэ машин аль хэдийн нэмэгдсэн", "info");
    set({ fits: [...d.fits, ...add] });
    setPick({ ...pick, year: "", engine: "" });
    toast(`${add.length} машин нэмэгдлээ`, "ok");
  };
  const selFits = d.fits.filter((f) => f.sel).length;

  const disc =
    d.oldPrice && +d.oldPrice > +d.price && +d.price > 0 ? Math.round((1 - +d.price / +d.oldPrice) * 100) : 0;

  const save = async () => {
    const e: Errors = {};
    if (!d.name.trim()) e.name = "Барааны нэр оруулна уу";
    if (!(+d.price > 0)) e.price = "Үнэ 0-ээс их байх ёстой";
    if (d.oldPrice && +d.oldPrice <= +d.price) e.oldPrice = "Хуучин үнэ одоогийн үнээс их байх ёстой";
    if (d.stock === "" || +d.stock < 0) e.stock = "Нөөцийн тоо оруулна уу";
    if (!d.oem.length) e.oem = "Хамгийн багадаа 1 OEM дугаар оруулна уу";
    if (Object.keys(e).length) {
      setErr(e);
      return toast("Формын алдааг засна уу", "err");
    }
    const name = d.name.trim();
    await saveProduct(
      {
        name,
        description: d.description,
        brand: d.brand,
        category: d.category,
        genuine: d.genuine,
        oem: d.oem,
        price: +d.price,
        oldPrice: d.oldPrice ? +d.oldPrice : null,
        stock: +d.stock,
        threshold: +d.threshold || 0,
        active: d.active,
        specs: d.specs.filter((s) => s.k.trim()),
        fits: d.fits.map(({ sel: _sel, ...f }) => f),
        images: d.images,
      },
      product?.id,
    );
    toast(product ? `“${name}” хадгалагдлаа` : `“${name}” шинээр нэмэгдлээ`, "ok");
    router.push("/products");
  };

  const num = (key: "price" | "oldPrice" | "stock" | "threshold", label: string, unit: string, req?: boolean) => (
    <label className="field" key={key}>
      <span>
        <span>{label}</span>
        {req && <span className="req"> *</span>}
      </span>
      <div className="with-unit">
        <input
          className="input lg"
          type="number"
          min={0}
          value={d[key]}
          aria-invalid={!!err[key as keyof Errors]}
          onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>, key as keyof Errors)}
          placeholder="0"
        />
        <span>{unit}</span>
      </div>
      {err[key as keyof Errors] && <span className="field-err">{err[key as keyof Errors]}</span>}
    </label>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Бараа", href: "/products" }, { label: product ? "Засах" : "Шинэ бараа" }]}
        title={product ? d.name || "Бараа засах" : "Шинэ бараа нэмэх"}
        sub={
          product ? (
            <>
              ID {product.id} · Дэлгүүрт <span className="mono">/product/{product.id}</span>
            </>
          ) : (
            "Шаардлагатай талбаруудыг (*) бөглөнө үү"
          )
        }
        actions={
          <>
            {product && (
              <button className="btn text-danger" onClick={() => confirmDelete([product], () => router.push("/products"))}>
                <Trash2 size={17} />
                Устгах
              </button>
            )}
            <Link href="/products" className="btn">
              <X size={17} />
              Болих
            </Link>
            <button className="btn primary" onClick={save}>
              <Check size={17} />
              Хадгалах
            </button>
          </>
        }
      />
      <div className="row-wrap">
        <div className="stack" style={{ flex: "2 1 600px", minWidth: 0 }}>
          <Panel title="Үндсэн мэдээлэл">
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16 }}>
              <label className="field">
                <span>
                  Барааны нэр <span className="req">*</span>
                </span>
                <input
                  className="input lg"
                  value={d.name}
                  aria-invalid={!!err.name}
                  onChange={(e) => set({ name: e.target.value }, "name")}
                  placeholder="жишээ: Тоормосны дэвсгэр, урд"
                />
                {err.name && <span className="field-err">{err.name}</span>}
              </label>
              <label className="field">
                Тайлбар
                <textarea
                  className="textarea"
                  rows={4}
                  value={d.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Барааны онцлог, суурилуулах заавар, баталгаа…"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Зураг" sub={`${d.images.length} / ${MAX_IMAGES} · Эхний зураг үндсэн`}>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
              <div
                className={styles.drop}
                data-drag={drag}
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <CloudUpload size={28} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 500 }}>
                  Зургаа энд чирж оруулах эсвэл <span style={{ color: "var(--accent)" }}>файл сонгох</span>
                </span>
                <span className="faint" style={{ fontSize: 12 }}>
                  PNG, JPG, WEBP · 5MB хүртэл · 1:1 харьцаа санал болгоно
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {d.images.length > 0 && (
                <div className={styles.imgs}>
                  {d.images.map((src, i) => (
                    <div key={i} className={styles.img}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      {i === 0 && <span className={styles.main}>Үндсэн</span>}
                      <button
                        className={styles.imgX}
                        aria-label="Зураг устгах"
                        onClick={() => set({ images: d.images.filter((_, j) => j !== i) })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title="Үзүүлэлт"
            action={
              <button className="link-btn" onClick={() => set({ specs: [...d.specs, { k: "", v: "" }] })}>
                <Plus size={15} />
                Мөр нэмэх
              </button>
            }
          >
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {d.specs.map((s, i) => (
                <div key={i} className={styles.spec}>
                  <input
                    className="input"
                    value={s.k}
                    aria-label="Үзүүлэлт"
                    onChange={(e) => set({ specs: d.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })}
                    placeholder="Үзүүлэлт (жишээ: Материал)"
                  />
                  <input
                    className="input"
                    value={s.v}
                    aria-label="Утга"
                    onChange={(e) => set({ specs: d.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })}
                    placeholder="Утга (жишээ: Керамик)"
                  />
                  <button className="btn md" style={{ padding: 0, width: 32 }} aria-label="Мөр хасах" onClick={() => set({ specs: d.specs.filter((_, j) => j !== i) })}>
                    <Minus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Тохирох машинууд" sub={`${d.fits.length} машин`} clip>
            <div className={styles.picker}>
              {(
                [
                  ["make", "Үйлдвэрлэгч", "Сонгох", makes, false],
                  ["model", "Загвар", "Сонгох", models, !pick.make],
                  ["year", "Он", "Сонгох", years, !pick.model],
                  ["engine", "Хөдөлгүүр", "Бүх хөдөлгүүр", engines, !pick.year],
                ] as const
              ).map(([k, label, ph, opts, dis]) => (
                <label key={k} className="field" style={{ flex: "1 1 140px", fontSize: 11.5 }}>
                  {label}
                  <select className="select" value={pick[k]} disabled={dis} onChange={(e) => setPickKey(k, e.target.value)}>
                    <option value="">{ph}</option>
                    {opts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ))}
              <button className="btn primary md" onClick={addFit}>
                <Plus size={16} />
                Нэмэх
              </button>
            </div>
            {selFits > 0 && (
              <div className="bulkbar">
                <strong>{selFits} сонгосон</strong>
                <button className="btn sm text-danger" onClick={() => set({ fits: d.fits.filter((f) => !f.sel) })}>
                  Устгах
                </button>
              </div>
            )}
            <div className="tbl-scroll">
              <div style={{ minWidth: 480 }}>
                <div className={`tr ${styles.fitCols}`} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", borderBottomColor: "var(--border)" }}>
                  <input
                    type="checkbox"
                    aria-label="Бүгдийг сонгох"
                    checked={d.fits.length > 0 && selFits === d.fits.length}
                    onChange={() => {
                      const v = !(d.fits.length > 0 && selFits === d.fits.length);
                      set({ fits: d.fits.map((f) => ({ ...f, sel: v })) });
                    }}
                  />
                  <span>Үйлдвэрлэгч</span>
                  <span>Загвар</span>
                  <span>Он</span>
                  <span>Хөдөлгүүр</span>
                  <span />
                </div>
                {d.fits.map((f, i) => (
                  <div key={`${f.model}-${f.years}-${f.engine}`} className={`tr ${styles.fitCols}`}>
                    <input
                      type="checkbox"
                      aria-label="Сонгох"
                      checked={!!f.sel}
                      onChange={() => set({ fits: d.fits.map((x, j) => (j === i ? { ...x, sel: !x.sel } : x)) })}
                    />
                    <span style={{ fontWeight: 500 }}>{f.make}</span>
                    <span>{f.model}</span>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {f.years}
                    </span>
                    <span className="muted">{f.engine || "Бүх хөдөлгүүр"}</span>
                    <button className="icon-btn" aria-label="Хасах" onClick={() => set({ fits: d.fits.filter((_, j) => j !== i) })}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {!d.fits.length && (
              <div className="empty sm" style={{ padding: "28px 16px" }}>
                Тохирох машин нэмээгүй байна. Дээрх сонголтоор үйлдвэрлэгч → загвар → он → хөдөлгүүр сонгоно уу.
              </div>
            )}
          </Panel>
        </div>

        <div className="stack" style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div className="panel panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong>Дэлгүүрт харагдах</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {d.active ? "Идэвхтэй — хэрэглэгчдэд харагдана" : "Ноорог — дэлгүүрт харагдахгүй"}
                </span>
              </div>
              <Switch lg on={d.active} label="Дэлгүүрт харагдах" onChange={() => set({ active: !d.active })} />
            </div>
            <div className="field">
              Төрөл
              <Segmented
                className="fill lg"
                options={[
                  ["orig", "Оригинал"],
                  ["analog", "Аналог"],
                ]}
                value={d.genuine ? "orig" : "analog"}
                onChange={(v) => set({ genuine: v === "orig" })}
              />
            </div>
          </div>
          <Panel title="Ангилал & брэнд">
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="field">
                <span>
                  Брэнд <span className="req">*</span>
                </span>
                <select className="select lg" value={d.brand} onChange={(e) => set({ brand: e.target.value })}>
                  {db.brands.map((b) => (
                    <option key={b.id}>{b.name}</option>
                  ))}
                  {!db.brands.some((b) => b.name === d.brand) && <option>{d.brand}</option>}
                </select>
              </label>
              <label className="field">
                <span>
                  Ангилал <span className="req">*</span>
                </span>
                <select className="select lg" value={d.category} onChange={(e) => set({ category: e.target.value })}>
                  {db.categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>
          <Panel
            title={
              <>
                OEM дугаар <span className="req" style={{ color: "var(--accent)" }}>*</span>
              </>
            }
          >
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className={styles.chips} aria-invalid={!!err.oem}>
                {d.oem.map((t, i) => (
                  <span key={t} className={styles.chip}>
                    {t}
                    <button aria-label={`${t} хасах`} onClick={() => set({ oem: d.oem.filter((_, j) => j !== i) })}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
                <input
                  value={d.oemIn}
                  onChange={(e) => set({ oemIn: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addOem();
                    } else if (e.key === "Backspace" && !d.oemIn && d.oem.length) set({ oem: d.oem.slice(0, -1) });
                  }}
                  onBlur={addOem}
                  placeholder="OEM нэмэх, Enter"
                  aria-label="OEM дугаар"
                />
              </div>
              {err.oem && <span className="field-err">{err.oem}</span>}
              <span className="field-hint">Олон дугаар оруулж болно. Эхнийх нь үндсэн, бусад нь хөндлөн лавлагаа. Хайлтад OEM-ээр олдоно.</span>
            </div>
          </Panel>
          <Panel title="Үнэ & нөөц" action={disc > 0 && <span className={styles.disc}>−{disc}% хямдрал</span>}>
            <div className={`panel-body ${styles.nums}`}>
              {num("price", "Үнэ", "₮", true)}
              {num("oldPrice", "Хуучин үнэ", "₮")}
              {num("stock", "Нөөц", "ш", true)}
              {num("threshold", "Доод хязгаар", "ш")}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/**
 * Images are stored inline (data URLs) with the product, and request/response
 * bodies on Vercel are capped at 4.5 MB — so photos are scaled down to at most
 * 1280 px and re-encoded as JPEG (typically 100–300 KB) before upload.
 */
function shrinkImage(file: File, max = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * k);
      canvas.height = Math.round(img.naturalHeight * k);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("image"));
    };
    img.src = src;
  });
}
