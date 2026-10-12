import type { QPaySettingsDto } from "@repo/types";

/**
 * QPay status for Тохиргоо. Credentials and DEMO_MODE come from env (Step 3
 * wires the actual QPay client); only the invoice code and environment label
 * are editable in the dashboard.
 */
export function qpayInfo(s: { invoiceCode: string; env: "sandbox" | "production" }): QPaySettingsDto {
  const api = process.env.PUBLIC_API_URL ?? "http://localhost:4000";
  return {
    invoiceCode: s.invoiceCode,
    env: s.env,
    demoMode: process.env.DEMO_MODE === "true",
    callbackUrl: `${api}/api/v1/payments/qpay/callback`,
    merchantConfigured: !!(process.env.QPAY_USERNAME && process.env.QPAY_PASSWORD),
  };
}
