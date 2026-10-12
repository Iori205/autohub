import "./load-env";

/** Server configuration from the root .env (see .env.example). Read lazily so builds don't need secrets. */

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
  /** Browser origins allowed to call the API with cookies */
  get corsOrigins() {
    return (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  /** e.g. ".autohub.mn" in production so web + admin subdomains share cookies; unset on localhost */
  get cookieDomain() {
    return process.env.COOKIE_DOMAIN || undefined;
  },
  get secureCookies() {
    return process.env.NODE_ENV === "production";
  },
};
