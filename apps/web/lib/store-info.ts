import type { StoreSettings } from "@repo/types";

// Server-safe: the layout builds this on the server and hands it to <SiteProvider>.

/** Store contact details from the dashboard's Тохиргоо → Дэлгүүр (apps/service /settings). */
export interface StoreInfo {
  name: string;
  /** "+976 7711-2233" */
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: string;
}

export function toStoreInfo(s: StoreSettings): StoreInfo {
  const digits = s.phone.replace(/\D/g, "");
  return {
    name: s.name,
    phone: `+976 ${s.phone}`,
    phoneHref: `tel:+976${digits}`,
    email: s.email,
    address: s.address,
    hours: s.hours,
  };
}
