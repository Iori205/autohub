"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Current time, re-rendered every `ms`. Only use under client-only UI. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const noopSubscribe = () => () => {};

/** false during SSR and the hydration pass, true afterwards. */
export const useHydrated = () =>
  useSyncExternalStore(noopSubscribe, () => true, () => false);
