import type { CategoryKey } from "./types";

// Store name, phone, e-mail, address and hours come from the API (/settings) via lib/site-context.

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
