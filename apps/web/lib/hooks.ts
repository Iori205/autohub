"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Одоогийн цаг, `ms` тутамд дахин зурагдана. Зөвхөн клиент талын UI-д хэрэглэнэ. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const noopSubscribe = () => () => {};

/** SSR болон hydration-ийн үед false, дараа нь true. */
export const useHydrated = () =>
  useSyncExternalStore(noopSubscribe, () => true, () => false);
