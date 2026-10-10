const z = (n: number) => String(n).padStart(2, "0");

export const fmt = (n: number) =>
  Math.round(n).toLocaleString("en-US") + "₮";

/** 2026.09.18 11:20 */
export const fmtDateTime = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};

/** 11:20:05 */
export const fmtTime = (t: number) => {
  const d = new Date(t);
  return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
};

/** 14:59 */
export const fmtMmSs = (ms: number) =>
  `${z(Math.floor(ms / 60000))}:${z(Math.floor(ms / 1000) % 60)}`;

export const brandInitials = (brand: string) =>
  brand
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const discountPct = (price: number, oldPrice?: number) =>
  oldPrice ? "−" + Math.round((1 - price / oldPrice) * 100) + "%" : "";
