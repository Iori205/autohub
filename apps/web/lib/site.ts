import type { CategoryKey } from "./types";

export const STORE_NAME = "AuToHub";
export const STORE_PHONE = "+976 7711-2233";
export const STORE_PHONE_HREF = "tel:+97677112233";
export const STORE_EMAIL = "info@selbeg.mn";
export const STORE_ADDRESS =
  "Улаанбаатар, Хан-Уул дүүрэг, 15-р хороо, Чингисийн өргөн чөлөө 24";
export const STORE_HOURS = "Даваа–Бямба 09:00–20:00";

export const THEME_KEY = "autohub:theme";

/** Runs in <head> before paint so a saved light theme doesn't flash dark. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;

export interface ShopQuery {
  cat?: CategoryKey;
  brand?: string;
  q?: string;
  sale?: boolean;
  /** only parts fitting the selected car */
  fit?: boolean;
}

export function shopHref({ cat, brand, q, sale, fit }: ShopQuery = {}): string {
  const sp = new URLSearchParams();
  if (brand) sp.set("brand", brand);
  if (q) sp.set("q", q);
  if (fit) sp.set("fit", "1");
  const qs = sp.toString() ? "?" + sp.toString() : "";
  if (sale) return "/sale" + qs;
  if (cat) return `/shop/${cat}` + qs;
  return "/shop" + qs;
}

export const productHref = (id: number) => `/product/${id}`;
export const FINDER_HREF = "/#finder";
