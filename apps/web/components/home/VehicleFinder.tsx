"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Car, ChevronDown, Search, X } from "lucide-react";
import { carLabel } from "../../lib/catalog";
import { shopHref } from "../../lib/site";
import { setCar, useShop } from "../../lib/store/shop";
import type { VehicleModel } from "../../lib/types";
import styles from "./VehicleFinder.module.css";

export function VehicleFinder({
  vehicles,
  fitCounts,
}: {
  vehicles: VehicleModel[];
  /** model → number of parts that fit it */
  fitCounts: Record<string, number>;
}) {
  const router = useRouter();
  const { car } = useShop();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engine, setEngine] = useState("");

  const makes = [...new Set(vehicles.map((v) => v.make))];
  const models = vehicles.filter((v) => v.make === make);
  const md = models.find((v) => v.model === model);
  const years = md
    ? Array.from({ length: md.yearTo - md.yearFrom + 1 }, (_, i) => String(md.yearTo - i))
    : [];

  const steps = [
    {
      num: "01",
      label: "Үйлдвэрлэгч",
      ph: "Сонгох",
      opts: makes,
      value: make,
      disabled: false,
      onChange: (v: string) => {
        setMake(v);
        setModel("");
        setYear("");
        setEngine("");
      },
    },
    {
      num: "02",
      label: "Загвар",
      ph: make ? "Сонгох" : "—",
      opts: models.map((m) => m.model),
      value: model,
      disabled: !make,
      onChange: (v: string) => {
        const en = models.find((m) => m.model === v)?.engines ?? [];
        setModel(v);
        setYear("");
        setEngine(en.length === 1 ? en[0]! : "");
      },
    },
    {
      num: "03",
      label: "Он",
      ph: md ? "Сонгох" : "—",
      opts: years,
      value: year,
      disabled: !md,
      onChange: setYear,
    },
    {
      num: "04",
      label: "Хөдөлгүүр",
      ph: md ? "Сонгох" : "—",
      opts: md?.engines ?? [],
      value: engine,
      disabled: !md,
      onChange: setEngine,
    },
  ];

  const ready = !!make && !!model;
  const find = () => {
    if (!ready) return;
    setCar({ make, model, year, engine });
    router.push(shopHref({ fit: true }));
  };
  const clear = () => {
    setCar(null);
  };

  return (
    <section id="finder" className={styles.finder}>
      <div className={styles.accentBar} />
      <div className={styles.head}>
        <div style={{ maxWidth: 680 }}>
          <div className={`mono ${styles.eyebrow}`}>СЭЛБЭГ ХАЙГЧ · 4 АЛХАМ</div>
          <h1 className={styles.title}>Машинаа сонгоод тохирох сэлбэгээ олоорой</h1>
        </div>
        <p className={`not-mobile ${styles.lede}`}>
          Үйлдвэрлэгч, загвар, он, хөдөлгүүрээ сонгоход зөвхөн таны машинд тохирох
          сэлбэг харагдана.
        </p>
      </div>

      <div className={styles.grid}>
        {steps.map((s) => (
          <label
            key={s.num}
            className={styles.step}
            style={{ opacity: s.disabled ? 0.45 : 1 }}
          >
            <span className={styles.stepLabel}>
              <span
                className="mono"
                style={{ color: s.value ? "var(--accent)" : "var(--mut)" }}
              >
                {s.num}
              </span>
              {s.label}
            </span>
            <span className="select-wrap">
              <select
                className={styles.select}
                value={s.value}
                disabled={s.disabled}
                onChange={(e) => s.onChange(e.target.value)}
                style={{ borderColor: s.value ? "var(--accent)" : undefined }}
              >
                <option value="">{s.ph}</option>
                {s.opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
        ))}
        <button
          className={styles.findBtn}
          onClick={find}
          style={{ opacity: ready ? 1 : 0.5 }}
        >
          <Search size={17} />
          Тохирох сэлбэг хайх
        </button>
      </div>

      {car && (
        <div className={styles.myCar}>
          <div className={`ok-pill ${styles.carPill}`}>
            <Car size={16} className={styles.ok} />
            <span className={styles.ok} style={{ fontWeight: 700 }}>
              Миний машин
            </span>
            <span>{carLabel(car)}</span>
            {car.engine && <span className={styles.mut}>{car.engine}</span>}
            <button onClick={clear} aria-label="Машин арилгах">
              <X size={13} />
            </button>
          </div>
          <span className={styles.fitCount}>
            {fitCounts[car.model] ?? 0} тохирох бараа нөөцөд байна
          </span>
        </div>
      )}
    </section>
  );
}
