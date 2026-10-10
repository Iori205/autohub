"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BatteryCharging, ChevronLeft, ChevronRight } from "lucide-react";
import { shopHref } from "../../lib/site";
import styles from "./Hero.module.css";

const SLIDES = [
  {
    tag: "Prius 30 / 50",
    t: "Гибрид Prius-ийн бүх сэлбэг нэг дор",
    s: "Инвертерийн насос, тоормос, шүүлтүүр — оригинал болон баталгаат аналог.",
    cta: "Prius сэлбэг үзэх",
    href: shopHref({ q: "Prius" }),
  },
  {
    tag: "Хямдрал −20%",
    t: "Тоормосны иж бүрдэл хямдарлаа",
    s: "Brembo, Toyota Genuine дэвсгэр — 10-р сарын 31 хүртэл.",
    cta: "Хямдрал үзэх",
    href: shopHref({ sale: true }),
  },
  {
    tag: "Өвлийн бэлтгэл",
    t: "−40°C-д ч найдвартай асаалт",
    s: "Bosch аккумулятор, 0W тос, антифриз — Land Cruiser-т бэлэн.",
    cta: "Батарей үзэх",
    href: shopHref({ cat: "battery" }),
  },
];

export function Hero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, [i]);

  const slide = SLIDES[i]!;

  return (
    <section className={styles.hero}>
      <div className={`striped ${styles.slider}`}>
        <div className={styles.fade} />
        <div className={styles.content}>
          <span className={styles.tag}>{slide.tag}</span>
          <h2 className={styles.title}>{slide.t}</h2>
          <p className={styles.sub}>{slide.s}</p>
          <Link href={slide.href} className={styles.cta}>
            {slide.cta}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className={styles.dots}>
          {SLIDES.map((_, k) => (
            <button
              key={k}
              aria-label={`Слайд ${k + 1}`}
              onClick={() => setI(k)}
              data-active={k === i}
            />
          ))}
        </div>
        <div className={styles.arrows}>
          <button
            onClick={() => setI((x) => (x + SLIDES.length - 1) % SLIDES.length)}
            aria-label="Өмнөх"
          >
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setI((x) => (x + 1) % SLIDES.length)} aria-label="Дараах">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className={styles.promos}>
        <Link href={shopHref({ cat: "filter" })} className={`striped ${styles.promo}`}>
          <span className={styles.promoEyebrow} style={{ color: "var(--accent)" }}>
            Toyota Genuine
          </span>
          <span className={styles.promoTitle}>Шүүлтүүр 18,500₮-с</span>
        </Link>
        <Link
          href={shopHref({ cat: "battery" })}
          className={`${styles.promo} ${styles.promoAccent}`}
        >
          <BatteryCharging size={28} className={styles.promoIcon} />
          <span className={styles.promoEyebrow}>Өвлийн бэлтгэл</span>
          <span className={styles.promoTitle}>Аккумулятор −15%</span>
        </Link>
      </div>
    </section>
  );
}
