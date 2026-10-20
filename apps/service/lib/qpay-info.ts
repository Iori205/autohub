import type { QPaySettingsDto } from "@repo/types";
import { callbackUrl, demoMode } from "./payments";
import { qpayConfig, qpayConfigured } from "./qpay";

/**
 * Тохиргоо хуудасны QPay төлөв. Merchant мэдээлэл, нэхэмжлэхийн код, орчин (QPAY_BASE_URL), DEMO_MODE бүгд env-ээс ирж
 * энд зөвхөн уншигдана; нууц утгыг хэзээ ч буцаахгүй.
 */
export function qpayInfo(saved: { invoiceCode: string; env: "sandbox" | "production" }): QPaySettingsDto {
  const c = qpayConfig();
  return {
    invoiceCode: c.invoiceCode || saved.invoiceCode,
    env: c.baseUrl.includes("sandbox") ? "sandbox" : "production",
    demoMode: demoMode(),
    callbackUrl: callbackUrl("{order}").replace(/&sig=.*$/, "&sig=…"),
    merchantConfigured: qpayConfigured(),
  };
}
