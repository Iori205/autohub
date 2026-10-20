# Deploying AuToHub (Vercel + Supabase)

Three Vercel projects from this one repo, one Supabase Postgres.

```
browser ──► web.vercel.app/api/*  ──rewrite──►  service.vercel.app/api/*  ──►  Supabase (pooler :6543)
browser ──► admin.vercel.app/api/* ──rewrite──►  service.vercel.app/api/*
QPay ─────────────────────────────────────────►  service.vercel.app/api/v1/payments/qpay/callback
```

Each frontend proxies `/api/*` to the service (`next.config.js` → `API_URL`). The browser only talks
to the site it is on, so the session cookies are first-party there. Separate `*.vercel.app` domains
can't share cookies (vercel.app is a public suffix), and browsers block third-party cookies, so a
direct browser → service setup would lose every login, guest cart and admin session.
Server-side fetches from the frontends go straight to `API_URL`.

## 1. Database (once, from your machine)

```bash
# .env: DIRECT_URL = Supabase direct or session-pooler string (port 5432)
npm run db:migrate     # applies all migrations, incl. 20261020010000_login_throttle
npm run db:seed        # only for a demo database; it wipes everything first
```

Migrations never run during a Vercel build.

## 2. Vercel projects

Create the service first; the frontends need its URL.

| | service | web | dashboard |
| --- | --- | --- | --- |
| Root Directory | `apps/service` | `apps/web` | `apps/dashboard` |
| Framework | Next.js | Next.js | Next.js |
| Build Command | default (`npm run build` = `prisma generate` + `next build`) | default | default |
| Install Command | default (npm workspaces, run at the repo root) | default | default |
| Node.js | 24.x (from `engines`) | 24.x | 24.x |
| Function region | same region as Supabase (e.g. `sin1` for ap-southeast-1) | same | same |

Keep "Include files outside the root directory" on (the default); the apps import `packages/*`.

### Environment variables (Production, and Preview if you use previews)

None of these are `NEXT_PUBLIC_`; nothing is exposed to the browser.

**service**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → "Transaction pooler" (port **6543**) |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `PUBLIC_API_URL` | the service's own URL, e.g. `https://autohub-service.vercel.app` (https) |
| `DEMO_MODE` | `false`; must be set explicitly (`true` = fake payments, demo only) |
| `QPAY_BASE_URL` | `https://merchant.qpay.mn/v2` (sandbox: `https://merchant-sandbox.qpay.mn/v2`) |
| `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE` | from QPay (required when `DEMO_MODE=false`) |
| `DATABASE_POOL_MAX` | optional, default 3 per instance on Vercel |
| `CORS_ORIGINS`, `COOKIE_DOMAIN` | leave unset |

The service checks these when an instance starts (`instrumentation.ts`). If one is missing or unsafe,
it refuses to serve and logs the list of problems.

**web** and **dashboard**

| Variable | Value |
| --- | --- |
| `API_URL` | the service URL, e.g. `https://autohub-service.vercel.app` |

`API_URL` is needed at build time (rewrites are fixed by `next build`). The build fails without it.

## 3. After the first deploy

- Open the dashboard → Тохиргоо → QPay → "Холболт шалгах" (tests the QPay credentials).
- Place a small real order and check that the QPay callback arrives (service logs:
  `/api/v1/payments/qpay/callback`).
- Deployment Protection: production URLs must stay public, because QPay calls the service and
  the frontends proxy to it. If you protect preview deployments, previews still work: they proxy to
  `API_URL`.
- Preview deployments use whatever `DATABASE_URL` you give the Preview environment. Use a
  separate Supabase project/branch if previews shouldn't touch production data.

## Notes

- Custom domains (e.g. `autohub.mn`, `admin.autohub.mn`) need no code change; keep `COOKIE_DOMAIN`
  unset unless you want one cookie shared by both.
- Product photos are stored inline (data URLs, shrunk to ≤1280 px JPEG in the dashboard). Vercel
  limits request/response bodies to 4.5 MB, so with many photos the admin product list will hit
  that limit. Move images to Supabase Storage before the catalogue grows.
