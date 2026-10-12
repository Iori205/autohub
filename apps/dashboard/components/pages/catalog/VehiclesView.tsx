"use client";

import { FileUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { deleteVehicle, importVehicles, saveVehicle } from "../../../lib/api/catalog";
import { downloadCsv } from "../../../lib/csv";
import { useDb } from "../../../lib/db";
import type { BadgeSpec } from "../../../lib/status";
import type { Db, Fuel, Vehicle } from "../../../lib/types";
import { confirmAction, openForm, toast } from "../../../lib/ui";
import { PageHeader } from "../../shell/PageHeader";
import { PageSkeleton } from "../../shell/PageSkeleton";
import { Badge, SearchInput, Segmented } from "../../ui/bits";
import { Modal } from "../../ui/Modal";
import styles from "./Catalog.module.css";

const FUEL_TONE: Record<Fuel, BadgeSpec["tone"]> = {
  Бензин: "amber",
  Дизель: "blue",
  Хайбрид: "green",
  Цахилгаан: "cyan",
};

export function VehiclesView() {
  const db = useDb();
  if (!db) return <PageSkeleton kpis={false} />;
  return <Vehicles db={db} />;
}

/** Products linked to a vehicle row (fitment on that model, any or this engine). */
export const vehicleProducts = (db: Db, v: Vehicle) =>
  db.products.filter((p) => p.fits.some((f) => f.make === v.make && f.model === v.model && (!f.engine || f.engine === v.engine))).length;

function vehicleForm(v?: Vehicle) {
  openForm({
    title: v ? "Машин засах" : "Машин нэмэх",
    fields: [
      { key: "make", label: "Үйлдвэрлэгч", required: true, placeholder: "Toyota" },
      { key: "model", label: "Загвар", required: true, placeholder: "Land Cruiser 200" },
      { key: "gen", label: "Үе / кузов", placeholder: "J200" },
      { key: "fuel", label: "Түлш", type: "select", options: ["Бензин", "Дизель", "Хайбрид", "Цахилгаан"] },
      { key: "yearFrom", label: "Эхлэх он", type: "number", required: true },
      { key: "yearTo", label: "Дуусах он", type: "number", required: true },
      { key: "engine", label: "Хөдөлгүүр", required: true, full: true, placeholder: "1VD-FTV 4.5 V8 Diesel" },
    ],
    values: v
      ? { make: v.make, model: v.model, gen: v.gen, fuel: v.fuel, yearFrom: String(v.yearFrom), yearTo: String(v.yearTo), engine: v.engine }
      : { make: "", model: "", gen: "", fuel: "Бензин", yearFrom: "", yearTo: "", engine: "" },
    validate: (x) =>
      +x.yearFrom! < 1980
        ? { yearFrom: "1980-аас хойшхи он" }
        : +x.yearFrom! > +x.yearTo!
          ? { yearTo: "Дуусах он эхлэх оноос хойш байх ёстой" }
          : {},
    onSubmit: async (x) => {
      await saveVehicle(
        {
          make: x.make!.trim(),
          model: x.model!.trim(),
          gen: x.gen!.trim(),
          fuel: x.fuel as Fuel,
          yearFrom: +x.yearFrom!,
          yearTo: +x.yearTo!,
          engine: x.engine!.trim(),
        },
        v?.id,
      );
      toast(`${x.make} ${x.model} ${v ? "шинэчлэгдлээ" : "нэмэгдлээ"}`, "ok");
    },
  });
}

function Vehicles({ db }: { db: Db }) {
  const [make, setMake] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const q = search.trim().toLowerCase();
  const list = db.vehicles.filter(
    (v) => (make === "all" || v.make === make) && (!q || `${v.model} ${v.engine} ${v.gen}`.toLowerCase().includes(q)),
  );
  const makes = [...new Set(db.vehicles.map((v) => v.make))];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Машины сан" }]}
        title="Машины сан"
        sub={`${makes.length} үйлдвэрлэгч · ${new Set(db.vehicles.map((v) => v.model)).size} загвар · ${db.vehicles.length} хөдөлгүүрийн хувилбар`}
        actions={
          <>
            <button className="btn" onClick={() => setImporting(true)}>
              <Upload size={17} />
              CSV импорт
            </button>
            <button className="btn primary" onClick={() => vehicleForm()}>
              <Plus size={17} />
              Машин нэмэх
            </button>
          </>
        }
      />
      <div className="panel clip">
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Загвар, хөдөлгүүр, үе" />
          <Segmented options={[["all", "Бүгд"], ...makes.map((m) => [m, m] as [string, string])]} value={make} onChange={setMake} />
          <span className="count">{list.length} мөр</span>
        </div>
        <div className="tbl-scroll">
          <div className={styles.vehTable}>
            <div className={`tr th ${styles.vehCols}`}>
              <span>Үйлдвэрлэгч</span>
              <span>Загвар</span>
              <span className="hide-narrow">Үе</span>
              <span>Он</span>
              <span>Хөдөлгүүр</span>
              <span>Түлш</span>
              <span className="right">Бараа</span>
              <span />
            </div>
            {list.map((v) => {
              const n = vehicleProducts(db, v);
              return (
                <div key={v.id} className={`tr hover ${styles.vehCols}`}>
                  <span className="strong">{v.make}</span>
                  <span style={{ fontWeight: 500 }}>{v.model}</span>
                  <span className="mono muted hide-narrow" style={{ fontSize: 12 }}>
                    {v.gen}
                  </span>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {v.yearFrom}–{v.yearTo}
                  </span>
                  <span>{v.engine}</span>
                  <span>
                    <Badge spec={{ label: v.fuel, tone: FUEL_TONE[v.fuel] }} />
                  </span>
                  <span className="right strong">{n}</span>
                  <span className="cell-actions">
                    <button className="icon-btn" aria-label="Засах" onClick={() => vehicleForm(v)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label="Устгах"
                      onClick={() =>
                        confirmAction({
                          title: `“${v.make} ${v.model} · ${v.engine}” устгах уу?`,
                          msg: n ? `${n} бараатай холбоос устана.` : "Энэ үйлдлийг буцаах боломжгүй.",
                          ok: "Устгах",
                          danger: true,
                          onOk: async () => {
                            await deleteVehicle(v.id);
                            toast(`“${v.make} ${v.model}” устгагдлаа`, "ok");
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
            {!list.length && <div className="empty sm">Машин олдсонгүй. CSV файлаар импортлох эсвэл гараар нэмнэ үү.</div>}
          </div>
        </div>
      </div>
      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </>
  );
}

const SAMPLE = [
  ["make", "model", "gen", "year_from", "year_to", "engine", "fuel"],
  ["Toyota", "Land Cruiser 200", "J200", 2008, 2021, "1VD-FTV 4.5 V8 Diesel", "Дизель"],
];

function ImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const choose = (f?: File) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) return toast("Зөвхөн .csv файл", "err");
    if (f.size > 10 * 1024 * 1024) return toast("Файл 10MB-аас их байна", "err");
    setFile(f);
  };

  const run = async () => {
    if (!file) return toast("Эхлээд CSV файл сонгоно уу", "err");
    setPct(0);
    const text = await file.text();
    // Progress is cosmetic in the mock; the service will stream real progress.
    for (let p = 20; p <= 100; p += 20) {
      await new Promise((r) => setTimeout(r, 160));
      setPct(p);
    }
    const r = await importVehicles(text);
    onClose();
    toast(`${r.added} мөр импортлогдлоо · ${r.errors} алдаа`, r.errors && !r.added ? "err" : "ok");
  };

  return (
    <Modal
      title="Машины сан импортлох"
      desc="CSV файлаас үйлдвэрлэгч, загвар, он, хөдөлгүүр нэмнэ"
      width={560}
      onClose={onClose}
      footer={
        <>
          <a
            href="#"
            style={{ marginRight: "auto", fontSize: 12.5 }}
            onClick={(e) => {
              e.preventDefault();
              downloadCsv("vehicles-template.csv", SAMPLE);
            }}
          >
            Жишээ загвар татах
          </a>
          <button className="btn" onClick={onClose}>
            Болих
          </button>
          <button className="btn primary" onClick={run} disabled={pct !== null} style={{ opacity: file ? 1 : 0.5 }}>
            Импортлох
          </button>
        </>
      }
    >
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          className={styles.drop}
          role="button"
          tabIndex={0}
          onClick={() => ref.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
        >
          <FileUp size={28} style={{ color: "var(--accent)" }} />
          <span style={{ fontWeight: 500 }}>{file ? `${file.name} сонгогдсон` : "CSV файлаа энд чирэх эсвэл сонгох"}</span>
          <span className="faint" style={{ fontSize: 12 }}>
            .csv · UTF-8 · 10MB хүртэл
          </span>
        </div>
        <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => choose(e.target.files?.[0])} />
        <div className={styles.sample}>
          {SAMPLE.map((r) => (
            <div key={String(r[0])}>{r.join(",")}</div>
          ))}
        </div>
        {pct !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>Импортлож байна…</span>
              <span>{pct}%</span>
            </div>
            <div className="bar">
              <span style={{ width: `${pct}%`, transition: "width .2s" }} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
