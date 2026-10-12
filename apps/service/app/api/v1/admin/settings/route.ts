import type { DeliverySettings, QPaySettingsDto, StoreSettings } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { qpayInfo } from "@/lib/qpay-info";
import { getSetting } from "@/lib/settings";

/** All settings for Тохиргоо. QPay merchant credentials are never returned (they live in env). */
export const GET = route(async (req) => {
  await requireStaff(req);
  const [store, delivery, qpay] = await Promise.all([getSetting("store"), getSetting("delivery"), getSetting("qpay")]);
  return ok<{ store: StoreSettings; delivery: DeliverySettings; qpay: QPaySettingsDto }>({ store, delivery, qpay: qpayInfo(qpay) });
});
