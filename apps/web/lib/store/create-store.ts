import { useSyncExternalStore } from "react";

/**
 * localStorage-д хадгалж болох жижиг гадаад store. Серверийн snapshot үргэлж `initial` тул SSR тогтвортой;
 * хадгалсан утга hydration-ий дараа орж ирнэ.
 */
export function createStore<T extends object>(
  initial: T,
  opts: { key?: string; persist?: (s: T) => Partial<T> } = {},
) {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    if (!opts.key) return;
    try {
      const raw = localStorage.getItem(opts.key);
      if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      /* эвдэрсэн хадгалалтыг үл тооно */
    }
  };

  const get = () => {
    load();
    return state;
  };

  const set = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    load();
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    if (opts.key) {
      try {
        localStorage.setItem(
          opts.key,
          JSON.stringify(opts.persist ? opts.persist(state) : state),
        );
      } catch {
        /* хадгалах сан дүүрсэн / идэвхгүй */
      }
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  const useValue = () => useSyncExternalStore(subscribe, get, () => initial);

  return { get, set, subscribe, useValue };
}
