"use client";

import { setDb } from "../db";
import { nowTs } from "../format";
import { newId } from "../ids";
import type { Db, Product, StockMove } from "../types";
import { staffName } from "./staff";

/*
 * Products & inventory data access — MOCK. Later: POST/PUT/DELETE /products,
 * PATCH /products/bulk, POST /inventory/adjustments (with image upload to storage).
 */

export type ProductInput = Omit<Product, "id">;

export async function saveProduct(input: ProductInput, id?: number): Promise<number> {
  let savedId = id ?? 0;
  const at = nowTs();
  const by = staffName();
  setDb((db) => {
    if (id) {
      const before = db.products.find((p) => p.id === id);
      const moves: StockMove[] =
        before && before.stock !== input.stock
          ? [move(id, input.stock - before.stock, "Барааны карт засвар", by, input.stock, at)]
          : [];
      return {
        products: db.products.map((p) => (p.id === id ? { ...input, id } : p)),
        stockLog: [...moves, ...db.stockLog],
      };
    }
    savedId = Math.max(0, ...db.products.map((p) => p.id)) + 1;
    const moves = input.stock ? [move(savedId, input.stock, "Шинэ бараа", by, input.stock, at)] : [];
    return { products: [{ ...input, id: savedId }, ...db.products], stockLog: [...moves, ...db.stockLog] };
  });
  return savedId;
}

export async function deleteProducts(ids: number[]) {
  setDb((db) => ({ products: db.products.filter((p) => !ids.includes(p.id)) }));
}

export async function setProductsActive(ids: number[], active: boolean) {
  setDb((db) => ({ products: db.products.map((p) => (ids.includes(p.id) ? { ...p, active } : p)) }));
}

export type PriceMode = "up" | "down" | "fixed";

export async function bulkPrice(ids: number[], mode: PriceMode, value: number) {
  setDb((db) => ({
    products: db.products.map((p) => {
      if (!ids.includes(p.id)) return p;
      const price =
        mode === "fixed"
          ? value
          : Math.round((p.price * (1 + ((mode === "up" ? 1 : -1) * value) / 100)) / 500) * 500;
      return { ...p, price: Math.max(0, price) };
    }),
  }));
}

export async function bulkStock(ids: number[], mode: "add" | "set", value: number) {
  const at = nowTs();
  const by = staffName();
  setDb((db) => {
    const moves: StockMove[] = [];
    const products = db.products.map((p) => {
      if (!ids.includes(p.id)) return p;
      const stock = Math.max(0, mode === "add" ? p.stock + value : value);
      if (stock !== p.stock) moves.push(move(p.id, stock - p.stock, "Бөөнөөр засварласан", by, stock, at));
      return { ...p, stock };
    });
    return { products, stockLog: [...moves, ...db.stockLog] };
  });
}

export async function setThreshold(id: number, threshold: number) {
  setDb((db) => ({ products: db.products.map((p) => (p.id === id ? { ...p, threshold } : p)) }));
}

export async function adjustStock(productId: number, delta: number, reason: string) {
  const at = nowTs();
  const by = staffName();
  let after = 0;
  setDb((db: Db) => {
    const products = db.products.map((p) => {
      if (p.id !== productId) return p;
      after = Math.max(0, p.stock + delta);
      return { ...p, stock: after };
    });
    return { products, stockLog: [move(productId, delta, reason, by, after, at), ...db.stockLog] };
  });
  return after;
}

function move(productId: number, delta: number, reason: string, by: string, after: number, at: string): StockMove {
  return { id: newId("s"), at, productId, delta, reason, by, after };
}
