"use client";

import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CATEGORY_ICONS } from "../icons";
import type { BadgeSpec } from "../../lib/status";
import type { Category, Product } from "../../lib/types";

export function Badge({ spec, dot, lg }: { spec: BadgeSpec; dot?: boolean; lg?: boolean }) {
  return (
    <span className={`badge tone-${spec.tone}${lg ? " lg" : ""}`}>
      {dot && <span className="dot" />}
      <span>{spec.label}</span>
    </span>
  );
}

export function Switch({
  on,
  onChange,
  lg,
  label,
}: {
  on: boolean;
  onChange: () => void;
  lg?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${lg ? " lg" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    />
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`seg ${className}`} role="group">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`search ${className}`}>
      <Search size={17} />
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

/** Барааны зураг, эсвэл ангиллын бүдэг дүрстэй зураасан орлуулга. */
export function Thumb({
  product,
  categories,
  size = 38,
}: {
  product?: Pick<Product, "images" | "category"> | null;
  categories?: Category[];
  size?: number;
}) {
  const img = product?.images[0];
  const icon = categories?.find((c) => c.key === product?.category)?.icon;
  const Icon = icon ? CATEGORY_ICONS[icon] : null;
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" />
      ) : (
        Icon && <Icon size={Math.round(size * 0.42)} strokeWidth={1.6} />
      )}
    </span>
  );
}

export function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="ico">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export function Panel({
  title,
  sub,
  action,
  children,
  clip,
  className = "",
  style,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  clip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`panel${clip ? " clip" : ""} ${className}`} style={style}>
      {title !== undefined && (
        <div className="panel-head">
          <div className="title">
            <h3>{title}</h3>
            {sub && <span className="panel-sub">{sub}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
