"use client";

import { useSyncExternalStore } from "react";
import { createSeed } from "./data/seed";
import type { Db } from "./types";

/*
 * MOCK BACKEND. The whole admin database lives in this module and is persisted
 * to localStorage so edits survive reloads. Pages never touch it directly:
 * reads go through useDb(), writes through the async functions in lib/api/*.
 * When apps/service is ready, those functions become fetch() calls and
 * useDb() is replaced by per-resource queries — the components stay the same.
 */

const KEY = "autohub-admin:db:v1";

let cache: Db | null = null;
const listeners = new Set<() => void>();

function load(): Db {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Db) : createSeed();
  } catch {
    cache = createSeed();
  }
  return cache;
}

function persist(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* quota exceeded or storage blocked — keep working in memory */
  }
}

export function getDb(): Db {
  return load();
}

export function setDb(update: (db: Db) => Partial<Db>) {
  const prev = load();
  cache = { ...prev, ...update(prev) };
  persist(cache);
  listeners.forEach((l) => l());
}

/** Drop local edits and go back to the seed data. */
export function resetDb() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  cache = createSeed();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** `null` during SSR / first paint — pages show their skeleton until data arrives. */
export const useDb = () => useSyncExternalStore(subscribe, load, () => null);
