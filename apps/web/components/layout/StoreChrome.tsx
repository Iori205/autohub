"use client";

import { usePathname } from "next/navigation";

/** Өөрийн бүтэн дэлгэцийн байрлалтай хуудсууд (дэлгүүрийн толгой, хөл, чатгүй). */
const BARE = ["/login"];

/** Дэлгүүрийн толгой/хөл/чат — дээрх хуудсуудад харагдахгүй. */
export function StoreChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return BARE.includes(path) ? null : <>{children}</>;
}
