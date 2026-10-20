import type { CategoryKey } from "./types";

// Дэлгүүрийн нэр, утас, и-мэйл, хаяг, цагийн хуваарь API-аас (/settings) lib/site-context-оор ирнэ.

export const THEME_KEY = "autohub:theme";

/** Хадгалсан цайвар горим харанхуй болж анивчихгүйн тулд <head>-д зурагдахаас өмнө ажиллана. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;

export interface ShopQuery {
  cat?: CategoryKey;
  brand?: string;
  q?: string;
  sale?: boolean;
  /** зөвхөн сонгосон машинд тохирох сэлбэг */
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
