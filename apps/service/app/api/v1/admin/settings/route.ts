import type { DeliverySettings, QPaySettingsDto, StoreSettings } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { qpayInfo } from "@/lib/qpay-info";
import { getSetting } from "@/lib/settings";

/** Тохиргоо хуудасны бүх тохиргоо. QPay merchant мэдээлэл env-д байдаг тул хэзээ ч буцаахгүй. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const [store, delivery, qpay] = await Promise.all([getSetting("store"), getSetting("delivery"), getSetting("qpay")]);
  return ok<{ store: StoreSettings; delivery: DeliverySettings; qpay: QPaySettingsDto }>({ store, delivery, qpay: qpayInfo(qpay) });
});
