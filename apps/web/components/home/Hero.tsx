"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BatteryCharging, ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerDto } from "@repo/types";
import { shopHref } from "../../lib/site";
import styles from "./Hero.module.css";


interface Slide {
  tag: string;
  t: string;
  s: string;
  cta: string;
  href: string;
}

/** Баннерын слайд = самбарын (Баннер & Хямдрал) идэвхтэй нүүрний баннерууд. */
export function Hero({ banners }: { banners: BannerDto[] }) {
  const SLIDES: Slide[] = banners.map((b) => ({ tag: b.eyebrow, t: b.title, s: b.subtitle, cta: b.ctaLabel || "Дэлгэрэнгүй", href: b.link }));
  const [i, setI] = useState(0);
  const n = Math.max(1, SLIDES.length);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [i, n]);

  // идэвхтэй баннер байхгүй: хоосон слайд байрлалыг хадгална
  const slide = SLIDES[i % n] ?? { tag: "", t: "", s: "", cta: "Дэлгүүр үзэх", href: shopHref() };

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
            onClick={() => setI((x) => (x + n - 1) % n)}
            aria-label="Өмнөх"
          >
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setI((x) => (x + 1) % n)} aria-label="Дараах">
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
