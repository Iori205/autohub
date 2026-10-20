/** «04465-47070», «0 092 S50 100» → «0446547070», «0092S50100» (Product.oemSearch-д хадгалдаг хэлбэр). */
export const normalizeOem = (s: string) => s.toUpperCase().replace(/[\s.\-/]/g, "");

/** «A1024» → 1024 */
export const orderNumberValue = (n: string) => Number(n.replace(/\D/g, "")) || 0;
