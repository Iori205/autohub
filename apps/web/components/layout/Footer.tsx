"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { FINDER_HREF, shopHref } from "../../lib/site";
import { useSite, type StoreInfo } from "../../lib/site-context";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "../icons";
import { Logo } from "./Logo";
import styles from "./Footer.module.css";

interface FooterLink {
  label: string;
  href: string;
  icon?: LucideIcon;
}

const sections = (site: StoreInfo): { key: string; title: string; links: FooterLink[] }[] => [
  {
    key: "shop",
    title: "ДЭЛГҮҮР",
    links: [
      { label: "Машинаа сонгох", href: FINDER_HREF },
      { label: "Бүх сэлбэг", href: shopHref() },
      { label: "Хямдрал", href: shopHref({ sale: true }) },
      { label: "Брэндүүд", href: "#" },
      { label: "Бөөний худалдаа", href: "#" },
    ],
  },
  {
    key: "info",
    title: "МЭДЭЭЛЭЛ",
    links: [
      { label: "Бидний тухай", href: "#" },
      { label: "Хүргэлтийн нөхцөл", href: "#" },
      { label: "Буцаалт ба баталгаа", href: "#" },
      { label: "Түгээмэл асуулт", href: "#" },
      { label: "Үйлчилгээний нөхцөл", href: "#" },
    ],
  },
  {
    key: "contact",
    title: "ХОЛБОО БАРИХ",
    links: [
      { label: site.phone, href: site.phoneHref, icon: Phone },
      { label: site.email, href: `mailto:${site.email}`, icon: Mail },
      { label: site.address, href: "#", icon: MapPin },
    ],
  },
];

function Socials({ size }: { size: "sm" | "lg" }) {
  const cls = `${styles.social} ${size === "lg" ? styles.socialLg : ""}`;
  return (
    <div className={styles.socials}>
      <a href="#" className={cls} aria-label="Facebook">
        <FacebookIcon size={17} />
      </a>
      <a href="#" className={cls} aria-label="Instagram">
        <InstagramIcon size={17} />
      </a>
      <a href="#" className={cls} aria-label="YouTube">
        <YoutubeIcon size={17} />
      </a>
    </div>
  );
}

export function Footer() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const site = useSite();
  const SECTIONS = sections(site);

  return (
    <footer className={styles.footer}>
      {/* mobile: accordion */}
      <div className={`only-mobile ${styles.mobile}`}>
        <div className={styles.brandCol}>
          <Logo size="sm" />
          <p className={styles.blurb}>
            Оригинал болон баталгаат аналог авто сэлбэгийг Улаанбаатарт хүргэнэ.
          </p>
          <Socials size="lg" />
        </div>
        <div className={styles.accordion}>
          {SECTIONS.map((s) => (
            <div key={s.key} className={styles.accItem}>
              <button
                className={styles.accHead}
                onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
                aria-expanded={!!open[s.key]}
              >
                {s.title}
                <ChevronDown
                  size={16}
                  className={styles.chev}
                  data-open={!!open[s.key]}
                />
              </button>
              {open[s.key] && (
                <div className={styles.accBody}>
                  {s.links.map((l) => (
                    <Link key={l.label} href={l.href} className={styles.accLink}>
                      {l.icon && <l.icon size={15} className={styles.accentIcon} />}
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* desktop: columns */}
      <div className={`not-mobile container ${styles.cols}`}>
        <div className={styles.brandCol}>
          <Logo size="md" />
          <p className={styles.blurb}>
            Оригинал болон баталгаат аналог авто сэлбэгийг Улаанбаатарт хүргэнэ.
            Toyota, Lexus, Hyundai, Nissan-ийн 40,000 гаруй нэр төрөл.
          </p>
          <Socials size="sm" />
        </div>
        {SECTIONS.slice(0, 2).map((s) => (
          <div key={s.key} className={styles.col}>
            <div className={`eyebrow ${styles.colTitle}`}>{s.title}</div>
            {s.links.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}
        <div className={styles.col} style={{ gap: 12 }}>
          <div className="eyebrow">ХОЛБОО БАРИХ</div>
          {SECTIONS[2]!.links.map((l) => (
            <span key={l.label} className={styles.contactRow}>
              {l.icon && <l.icon size={15} className={styles.accentIcon} />}
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>© 2026 {site.name}. Бүх эрх хуулиар хамгаалагдсан.</span>
        <span>Төлбөр: QPay — бүх банкны апп</span>
      </div>
    </footer>
  );
}
