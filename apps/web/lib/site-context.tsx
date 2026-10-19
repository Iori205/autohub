"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoreInfo } from "./store-info";

export type { StoreInfo };

const Ctx = createContext<StoreInfo | null>(null);

export function SiteProvider({ store, children }: { store: StoreInfo; children: ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useSite(): StoreInfo {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSite() outside <SiteProvider>");
  return s;
}
