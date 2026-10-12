import { prisma, type Prisma } from "@repo/db";
import type { DeliveryMethod, DeliverySettings, SettingKey, StoreSettings } from "@repo/types";

/** Used when a key hasn't been saved yet (same values as the seed). */
export const DEFAULTS = {
  store: {
    name: "AuToHub",
    phone: "7711-2233",
    email: "info@selbeg.mn",
    address: "Улаанбаатар, Хан-Уул дүүрэг, 15-р хороо, Чингисийн өргөн чөлөө 24",
    hours: "Даваа–Бямба 09:00–20:00",
  } satisfies StoreSettings,
  delivery: {
    zones: [
      { id: "z1", name: "УБ төв (6 дүүрэг)", fee: 5000, eta: "24 цагийн дотор", active: true },
      { id: "z2", name: "УБ захын хороолол", fee: 8000, eta: "24–48 цаг", active: true },
      { id: "z3", name: "Орон нутаг (унаанд тавих)", fee: 15000, eta: "2–4 өдөр", active: true },
      { id: "z4", name: "Дэлгүүрээс очиж авах", fee: 0, eta: "Шууд", active: true },
    ],
    freeOver: 200000,
  } satisfies DeliverySettings,
  qpay: { invoiceCode: "AUTOHUB_INVOICE", env: "sandbox" as "sandbox" | "production" },
};

export const PICKUP_ADDRESS = "Хан-Уул салбар, Чингисийн өргөн чөлөө 24";

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return { ...DEFAULTS[key], ...((row?.value as object | undefined) ?? {}) } as (typeof DEFAULTS)[K];
}

export async function putSetting(key: SettingKey, value: object) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
}

/** Which delivery zone prices each checkout method. */
const ZONE_FOR: Record<DeliveryMethod, string> = { UB: "z1", COUNTRY: "z3", PICKUP: "z4" };
const FALLBACK: Record<DeliveryMethod, number> = { UB: 5000, COUNTRY: 15000, PICKUP: 0 };

/** Shipping fee for a checkout: UB courier is free from `freeOver`; pickup is free. */
export function deliveryFee(method: DeliveryMethod, subtotal: number, d: DeliverySettings) {
  if (method === "PICKUP") return 0;
  const zone = d.zones.find((z) => z.id === ZONE_FOR[method]);
  const fee = zone?.fee ?? FALLBACK[method];
  if (method === "UB" && d.freeOver > 0 && subtotal >= d.freeOver) return 0;
  return fee;
}
