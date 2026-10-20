import type { StoreSettings } from "@repo/types";

// Сервер талд ч ашиглаж болно: layout үүнийг сервер дээр бэлдээд <SiteProvider>-д өгнө.

/** Самбарын Тохиргоо → Дэлгүүр хэсгийн холбоо барих мэдээлэл (apps/service /settings). */
export interface StoreInfo {
  name: string;
  /** «+976 7711-2233» */
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
