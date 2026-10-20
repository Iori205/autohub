import { deliverySettingsInput, qpaySettingsInput, storeSettingsInput, SETTING_KEYS, type SettingKey } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, notFound, ok, route } from "@/lib/http";
import { qpayInfo } from "@/lib/qpay-info";
import { putSetting } from "@/lib/settings";

const SCHEMA = { store: storeSettingsInput, delivery: deliverySettingsInput, qpay: qpaySettingsInput } as const;

/** Тохиргооны нэг хэсгийг хадгална (зөвхөн ADMIN). */
export const PUT = route<RouteContext<"/api/v1/admin/settings/[key]">>(async (req, { params }) => {
  await requireStaff(req, "ADMIN");
  const key = (await params).key as SettingKey;
  if (!SETTING_KEYS.includes(key)) throw notFound("Тохиргоо олдсонгүй");
  const value = await body(req, SCHEMA[key]);
  await putSetting(key, value);
  return ok(key === "qpay" ? qpayInfo(value as { invoiceCode: string; env: "sandbox" | "production" }) : value);
});
