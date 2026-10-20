"use client";

import { usePathname } from "next/navigation";

/** Pages that bring their own full-screen layout (no store header, footer or chat). */
const BARE = ["/login"];

/** Store header/footer/chat — left out on the bare pages. */
export function StoreChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return BARE.includes(path) ? null : <>{children}</>;
}
