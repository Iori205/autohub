"use client";

import type { CartDto, ProductSummaryDto, SavedCarDto } from "@repo/types";
import { api, ApiError } from "../api/client";
import { toCartLines } from "../api/map";
import type { Car, CartLine, DeliveryMethod, Product } from "../types";
import { createStore } from "./create-store";

/*
 * Дэлгүүрийн сессийн төлөв. Сагс, хүслийн жагсаалт, сонгосон машин өгөгдлийн санд (apps/service, зочин/хэрэглэгчийн сесс бүрт);
 * өөрчлөлтийг урьдчилан харуулаад серверийн хариугаар солино. Зөвхөн харьцуулах жагсаалт, хүргэлтийн сонголт хөтөчид хадгалагдана.
 */

interface ShopState {
  cart: CartLine[];
  wish: number[];
  compare: number[];
  car: Car | null;
  delivery: DeliveryMethod;
  /** дөнгөж нэмсэн барааны id — «Сагсанд нэмэгдлээ» шошгыг удирдана */
  added: number | null;
  toast: string | null;
  /** серверийн төлөв ачаалагдсан */
  synced: boolean;
}

const store = createStore<ShopState>(
  { cart: [], wish: [], compare: [], car: null, delivery: "ship", added: null, toast: null, synced: false },
  { key: "autohub:prefs:v1", persist: ({ compare, delivery }) => ({ compare, delivery }) },
);

const LEGACY_KEY = "autohub:shop:v1"; // хөтөчид хадгалсан хуучин сагс/хүсэл/машин

const fromCarDto = (c: SavedCarDto | null): Car | null =>
  c ? { make: c.make, model: c.model, year: String(c.year), engine: c.engine } : null;

let loading: Promise<void> | null = null;

/** Сагс, хүслийн жагсаалт, машиныг API-аас ачаална (хуудас ачаалах бүрт нэг удаа). */
export function syncShop(force = false) {
  if (typeof window === "undefined") return Promise.resolve();
  if (loading && !force) return loading;
  loading = (async () => {
    try {
      let [cart, wish, car] = await Promise.all([
        api<CartDto>("/cart"),
        api<ProductSummaryDto[]>("/wishlist"),
        api<SavedCarDto | null>("/me/car"),
      ]);
      ({ cart, wish, car } = await importLegacy(cart, wish, car));
      store.set({ cart: toCartLines(cart), wish: wish.map((p) => p.id), car: fromCarDto(car), synced: true });
    } catch (e) {
      store.set({ synced: true });
      if (e instanceof ApiError) showToast(e.message);
    }
  })();
  return loading;
}

/** Хөтөчид хадгалсан хуучин сагс/хүслийн жагсаалт/машиныг API руу нэг удаа шилжүүлнэ. */
async function importLegacy(cart: CartDto, wish: ProductSummaryDto[], car: SavedCarDto | null) {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    /* хадгалах сан хаалттай */
  }
  if (!raw) return { cart, wish, car };
  try {
    const old = JSON.parse(raw) as { cart?: CartLine[]; wish?: number[]; car?: Car | null };
    if (!cart.items.length && old.cart?.length)
      cart = await api<CartDto>("/cart", { method: "PUT", body: { items: old.cart.map((l) => ({ productId: l.product.id, qty: l.qty })) } });
    if (!wish.length && old.wish?.length) {
      await Promise.all(old.wish.map((id) => api(`/wishlist/${id}`, { method: "PUT" }).catch(() => null)));
      wish = await api<ProductSummaryDto[]>("/wishlist");
    }
    if (!car && old.car?.make)
      car = await api<SavedCarDto>("/me/car", { method: "PUT", body: { ...old.car, year: Number(old.car.year) || 2015 } }).catch(() => null);
  } finally {
    localStorage.removeItem(LEGACY_KEY);
  }
  return { cart, wish, car };
}

export function useShop() {
  const s = store.useValue();
  if (typeof window !== "undefined" && !loading) void syncShop();
  return s;
}

/** API дуудна; амжилтгүй бол мессеж харуулж серверийн төлөвийг дахин ачаална. */
async function mutate(run: () => Promise<void>) {
  try {
    await run();
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : "Алдаа гарлаа. Дахин оролдоно уу");
    await syncShop(true);
  }
}

const putQty = (id: number, qty: number) =>
  mutate(async () => {
    const cart = await api<CartDto>(`/cart/items/${id}`, { method: "PUT", body: { qty } });
    store.set({ cart: toCartLines(cart) });
  });

let addedTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function addToCart(product: Product, qty = 1) {
  const ex = store.get().cart.find((l) => l.product.id === product.id);
  const next = (ex?.qty ?? 0) + qty;
  store.set((s) => ({
    cart: ex ? s.cart.map((l) => (l.product.id === product.id ? { ...l, qty: next } : l)) : [...s.cart, { product, qty }],
    added: product.id,
  }));
  clearTimeout(addedTimer);
  addedTimer = setTimeout(() => store.set({ added: null }), 1600);
  void putQty(product.id, next);
}

export function setLineQty(id: number, qty: number) {
  const q = Math.max(1, qty);
  store.set((s) => ({ cart: s.cart.map((l) => (l.product.id === id ? { ...l, qty: q } : l)) }));
  void putQty(id, q);
}

export function removeLine(id: number) {
  store.set((s) => ({ cart: s.cart.filter((l) => l.product.id !== id) }));
  void mutate(async () => {
    const cart = await api<CartDto>(`/cart/items/${id}`, { method: "DELETE" });
    store.set({ cart: toCartLines(cart) });
  });
}

/** Checkout-ын дараа сервер сагсыг аль хэдийн хоосолсон; энэ нь зөвхөн харагдацыг шинэчилнэ. */
export const clearCart = () => store.set({ cart: [] });

export function toggleWish(id: number) {
  const on = store.get().wish.includes(id);
  store.set((s) => ({ wish: on ? s.wish.filter((x) => x !== id) : [...s.wish, id] }));
  void mutate(() => api(`/wishlist/${id}`, { method: on ? "DELETE" : "PUT" }));
}

export const toggleCompare = (id: number) =>
  store.set((s) => ({ compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : [...s.compare, id] }));

export function setCar(car: Car | null) {
  store.set({ car });
  void mutate(async () => {
    if (!car) await api("/me/car", { method: "DELETE" });
    else await api("/me/car", { method: "PUT", body: { make: car.make, model: car.model, year: Number(car.year) || 0, engine: car.engine } });
  });
}

export const setDelivery = (delivery: DeliveryMethod) => store.set({ delivery });

export function showToast(text: string) {
  store.set({ toast: text });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => store.set({ toast: null }), 2000);
}

export const cartTotals = (cart: CartLine[]) => ({
  count: cart.reduce((a, l) => a + l.qty, 0),
  subtotal: cart.reduce((a, l) => a + l.product.price * l.qty, 0),
});
