"use client";

import type { Car, CartLine, DeliveryMethod, Product } from "../types";
import { createStore } from "./create-store";

interface ShopState {
  cart: CartLine[];
  wish: number[];
  compare: number[];
  car: Car | null;
  delivery: DeliveryMethod;
  /** product id that was just added — drives the "Сагсанд нэмэгдлээ" label */
  added: number | null;
  toast: string | null;
}

const store = createStore<ShopState>(
  { cart: [], wish: [], compare: [], car: null, delivery: "ship", added: null, toast: null },
  {
    key: "autohub:shop:v1",
    persist: ({ cart, wish, compare, car, delivery }) => ({ cart, wish, compare, car, delivery }),
  },
);

export const useShop = store.useValue;

let addedTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function addToCart(product: Product, qty = 1) {
  store.set((s) => {
    const ex = s.cart.find((l) => l.product.id === product.id);
    const cart = ex
      ? s.cart.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + qty } : l,
        )
      : [...s.cart, { product, qty }];
    return { cart, added: product.id };
  });
  clearTimeout(addedTimer);
  addedTimer = setTimeout(() => store.set({ added: null }), 1600);
}

export const setLineQty = (id: number, qty: number) =>
  store.set((s) => ({
    cart: s.cart.map((l) =>
      l.product.id === id ? { ...l, qty: Math.max(1, qty) } : l,
    ),
  }));

export const removeLine = (id: number) =>
  store.set((s) => ({ cart: s.cart.filter((l) => l.product.id !== id) }));

export const clearCart = () => store.set({ cart: [] });

const toggleIn = (arr: number[], id: number) =>
  arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

export const toggleWish = (id: number) =>
  store.set((s) => ({ wish: toggleIn(s.wish, id) }));

export const toggleCompare = (id: number) =>
  store.set((s) => ({ compare: toggleIn(s.compare, id) }));

export const setCar = (car: Car | null) => store.set({ car });

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
