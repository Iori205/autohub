import "./load-env";

/** Server configuration from the root .env (see .env.example). Read lazily so builds don't need secrets. */

const isProd = () => process.env.NODE_ENV === "production";
const DEV_ORIGINS = "http://localhost:3000,http://localhost:3001";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — copy .env.example to .env at the repo root`);
  return v;
}

export const env = {
  get authSecret() {
    const s = required("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
    return new TextEncoder().encode(s);
  },
  /**
   * Browser origins allowed to call the API directly with cookies. The
   * frontends proxy /api/* (same origin), so production usually needs none;
   * "*" is never honoured because responses carry credentials.
   */
  get corsOrigins() {
    return (process.env.CORS_ORIGINS ?? (isProd() ? "" : DEV_ORIGINS))
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter((s) => s && s !== "*");
  },
  /** Only when web + dashboard deliberately share a parent domain (e.g. ".autohub.mn"); unset otherwise */
  get cookieDomain() {
    return process.env.COOKIE_DOMAIN || undefined;
  },
  get secureCookies() {
    return isProd();
  },
  /** This service's own public URL — QPay calls the payment callback on it directly (not via a frontend). */
  get publicApiUrl() {
    const v = process.env.PUBLIC_API_URL || (isProd() ? "" : "http://localhost:4000");
    if (!v) throw new Error("PUBLIC_API_URL is not set — the QPay callback URL is built from it");
    return v.replace(/\/$/, "");
  },
};

/**
 * Called once at server start (instrumentation.ts). In production a missing or
 * unsafe setting stops the server with a clear message instead of failing on
 * the first request that needs it.
 */
export function validateEnv() {
  if (!isProd()) return;
  const problems: string[] = [];
  const v = (k: string) => process.env[k] ?? "";

  if (!v("DATABASE_URL")) problems.push("DATABASE_URL is not set (Supabase transaction pooler, port 6543)");
  if (v("AUTH_SECRET").length < 32) problems.push("AUTH_SECRET must be set to 32+ random characters");
  if (!["true", "false"].includes(v("DEMO_MODE")))
    problems.push('DEMO_MODE must be set explicitly to "false" (real QPay) or "true" (demo, fake payments)');
  if (!v("PUBLIC_API_URL")) problems.push("PUBLIC_API_URL is not set (this service's public URL; QPay callback base)");
  if (v("DEMO_MODE") === "false") {
    for (const k of ["QPAY_USERNAME", "QPAY_PASSWORD", "QPAY_INVOICE_CODE"]) if (!v(k)) problems.push(`${k} is not set (DEMO_MODE=false)`);
    if (v("PUBLIC_API_URL") && !/^https:\/\//.test(v("PUBLIC_API_URL")))
      problems.push("PUBLIC_API_URL must be https (QPay calls the payment callback on it)");
  }
  if (v("CORS_ORIGINS").split(",").some((s) => s.trim() === "*"))
    problems.push('CORS_ORIGINS must list exact origins — "*" cannot be used with cookies');

  if (v("DEMO_MODE") === "true")
    console.warn("[service] DEMO_MODE=true in production: no real QPay; anyone can mark their own order paid via /payments/demo/*");
  if (problems.length) throw new Error(`[service] invalid production environment:\n  - ${problems.join("\n  - ")}`);
}
