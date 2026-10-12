import type { QPaySettingsDto } from "@repo/types";
import { callbackUrl, demoMode } from "./payments";
import { qpayConfig, qpayConfigured } from "./qpay";

/**
 * QPay status for Тохиргоо. Merchant credentials, the invoice code, the
 * environment (QPAY_BASE_URL) and DEMO_MODE all come from env and are
 * read-only here; secrets are never returned.
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
