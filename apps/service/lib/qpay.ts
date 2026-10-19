import "./load-env";
import { ApiError } from "./http";

/*
 * QPay merchant API v2 client.
 *   sandbox    https://merchant-sandbox.qpay.mn/v2   (default)
 *   production https://merchant.qpay.mn/v2            (QPAY_BASE_URL)
 * Docs: https://developer.qpay.mn — auth/token, invoice, payment/check.
 */

const TIMEOUT_MS = 10_000;

export const qpayConfig = () => ({
  baseUrl: (process.env.QPAY_BASE_URL || "https://merchant-sandbox.qpay.mn/v2").replace(/\/$/, ""),
  username: process.env.QPAY_USERNAME ?? "",
  password: process.env.QPAY_PASSWORD ?? "",
  invoiceCode: process.env.QPAY_INVOICE_CODE ?? "",
});

export const qpayConfigured = () => {
  const c = qpayConfig();
  return !!(c.username && c.password && c.invoiceCode);
};

export interface QPayUrl {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  /** base64 PNG (no data: prefix) */
  qr_image: string;
  qPay_shortUrl?: string;
  urls?: QPayUrl[];
}

export interface QPayPaymentRow {
  payment_id: string;
  payment_status: "NEW" | "FAILED" | "PAID" | "REFUNDED" | string;
  payment_amount: number | string;
  payment_date?: string;
}

export interface QPayCheck {
  count: number;
  paid_amount?: number;
  rows: QPayPaymentRow[];
}

/* ---------- token cache ---------- */

let token: { access: string; refresh: string; expiresAt: number; refreshExpiresAt: number } | null = null;

/** QPay returns expiry as a unix timestamp (seconds); accept a duration too, just in case. */
const toMs = (v: unknown) => {
  const n = Number(v) || 0;
  return n > 1e9 ? n * 1000 : Date.now() + n * 1000;
};

async function call<T>(path: string, init: RequestInit & { auth?: string }): Promise<T> {
  const { baseUrl } = qpayConfig();
  let res: Response;
  try {
    res = await fetch(baseUrl + path, {
      ...init,
      headers: { "content-type": "application/json", ...(init.auth ? { authorization: init.auth } : {}), ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[qpay] network error", path, (e as Error).message);
    throw new ApiError("PAYMENT_PROVIDER", "QPay-тэй холбогдож чадсангүй. Дахин оролдоно уу");
  }
  const text = await res.text();
  if (!res.ok) {
    console.error("[qpay] HTTP", res.status, path, text.slice(0, 300));
    if (res.status === 401) token = null;
    throw new ApiError("PAYMENT_PROVIDER", "QPay хүсэлт амжилтгүй боллоо");
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (token && token.expiresAt - 60_000 > now) return token.access;
  if (!qpayConfigured()) throw new ApiError("UNAVAILABLE", "QPay тохируулаагүй байна (QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE)");
  type Tok = { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number };
  let t: Tok | null = null;
  if (token && token.refreshExpiresAt - 60_000 > now)
    t = await call<Tok>("/auth/refresh", { method: "POST", auth: `Bearer ${token.refresh}` }).catch(() => null);
  const { username, password } = qpayConfig();
  t ??= await call<Tok>("/auth/token", { method: "POST", auth: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` });
  token = { access: t.access_token, refresh: t.refresh_token, expiresAt: toMs(t.expires_in), refreshExpiresAt: toMs(t.refresh_expires_in) };
  return token.access;
}

/* ---------- API ---------- */

export async function createInvoice(p: {
  senderInvoiceNo: string;
  receiverCode: string;
  description: string;
  amount: number;
  callbackUrl: string;
}): Promise<QPayInvoice> {
  const auth = `Bearer ${await accessToken()}`;
  return call<QPayInvoice>("/invoice", {
    method: "POST",
    auth,
    body: JSON.stringify({
      invoice_code: qpayConfig().invoiceCode,
      sender_invoice_no: p.senderInvoiceNo,
      invoice_receiver_code: p.receiverCode,
      invoice_description: p.description,
      amount: p.amount,
      callback_url: p.callbackUrl,
    }),
  });
}

export async function checkInvoice(invoiceId: string): Promise<QPayCheck> {
  const auth = `Bearer ${await accessToken()}`;
  return call<QPayCheck>("/payment/check", {
    method: "POST",
    auth,
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
  });
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
  const auth = `Bearer ${await accessToken()}`;
  await call(`/invoice/${encodeURIComponent(invoiceId)}`, { method: "DELETE", auth });
}

/** Тохиргоо → "Холболт шалгах": request a fresh token with the env credentials. */
export async function testConnection(): Promise<void> {
  token = null;
  await accessToken();
}
