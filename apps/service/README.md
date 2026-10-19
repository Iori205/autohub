# AuToHub API (apps/service)

Next.js route handlers under `/api/v1`, on **http://localhost:4000**. Data comes from
`@repo/db` (Prisma/PostgreSQL); request bodies and responses are typed in `@repo/types`.

```bash
npm run dev -w service        # reads the root .env (DATABASE_URL, AUTH_SECRET, …)
npm run test:api -w service       # end-to-end checks; needs a freshly seeded dev DB
npm run test:payments -w service  # QPay flow (MODE=demo|off|sandbox); same DB rule
npm run test:e2e                  # (repo root) Playwright, web + dashboard, on a throwaway local DB
```

## Database

```bash
npm run db:migrate   # apply migrations (DIRECT_URL)
npm run db:seed      # wipe + load the mock history as of its own "today" (2026-10-11)
npm run db:demo      # wipe + load the same data moved to the present — the newest order is a
                     # minute old, today's KPIs/charts are filled and the pending orders are fresh
                     # (their 15-minute invoices are open). Run right before a demo.
```

Both seeds **delete everything first** (orders placed since included). Migration
`20261019010000_rls_lockdown` enables Row Level Security on every table and revokes the
Supabase `anon`/`authenticated` roles, so Supabase's auto-generated REST/GraphQL API exposes
nothing; the service connects as the table owner and isn't affected.

## Conventions

- JSON in, JSON out. Mutating requests must send `Content-Type: application/json`.
- Errors: `{ "error": { "code", "message", "fields"? } }` with 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500.
  Validation errors (422) map field paths to Mongolian messages, e.g. `"delivery.address": "Дэлгэрэнгүй хаягаа оруулна уу"`.
- Money is whole tögrög; dates are ISO strings; business days are Ulaanbaatar days (UTC+8).
- CORS: only `CORS_ORIGINS` (web :3000, dashboard :3001) get credentialed access. Call with `credentials: "include"`.
- Sessions are httpOnly cookies signed with `AUTH_SECRET`:
  - `autohub_customer` — storefront. A **guest** session is created automatically the first time
    the cart, wishlist or orders are used; registering upgrades the guest in place, logging in moves
    the guest's cart/wishlist/orders into the account.
  - `autohub_admin_session` — dashboard staff (the name the dashboard's `proxy.ts` checks).
    Roles: `OPERATOR` (orders, products, stock, catalog, marketing) and `ADMIN` (+ settings, staff).
- Login endpoints are throttled (10 failed attempts / 15 min per IP + login).

## Storefront

| Method | Path | |
| --- | --- | --- |
| GET | `/health` | liveness + DB |
| GET | `/catalog/categories` | with active product counts |
| GET | `/catalog/brands` | |
| GET | `/catalog/products` | `q` (name, brand or OEM — spaces/dashes ignored), `category`, `brand`, `type=orig\|analog`, `inStock`, `sale`, `priceMin/Max`, fitment `make&model&year&engine` or `vehicleId`, `sort=rec\|asc\|desc\|stock`, `page`, `pageSize` |
| GET | `/catalog/products/:id` | detail with specs and fitments |
| GET | `/catalog/fitment` | parts for a vehicle (same filters, no paging) |
| GET | `/vehicles` | variants; `make`, `model`, `year` |
| GET | `/vehicles/options` | finder cascade: makes → models → years → engines |
| GET | `/banners`, `/campaigns` | active ones |
| GET | `/settings` | store info, delivery zones, base fees, free-delivery threshold |
| GET/PUT/DELETE | `/cart` | get / replace all / clear |
| PUT/DELETE | `/cart/items/:productId` | `{ qty }` |
| GET | `/wishlist`; PUT/DELETE `/wishlist/:productId` | |
| GET/POST | `/orders` | my orders / checkout (`customer`, `delivery`, `note`, `car`, optional `items` else the cart) |
| GET | `/orders/:number` | my order |
| POST | `/orders/lookup` | guest lookup: `{ phone, number }` |
| GET | `/auth/me` · POST `/auth/register`, `/auth/login` (`login` = phone or e-mail), `/auth/logout` | |

Checkout creates a `PENDING` order with a 15-minute invoice window; prices and the delivery fee are
computed on the server (UB courier free from `delivery.freeOver`, pickup free, province fee from the
zone settings).

## Payments (QPay v2)

| Method | Path | |
| --- | --- | --- |
| POST | `/payments/qpay/invoice` `{ number }` | `{ invoiceId, qrImage (data URL), qrText, shortUrl, urls: [{ name, description, logo, link }], expiresAt, amount, demo }` — reuses a valid invoice, otherwise issues a new 15-minute one (also reopens an expired order) |
| POST | `/payments/qpay/check` `{ number }` | poll every few seconds → `{ paymentStatus, stage, paidAt, secondsLeft }` |
| POST | `/payments/qpay/cancel` `{ number }` | "Төлбөрийг цуцлах": invoice cancelled, order kept (EXPIRED) and payable again |
| GET/POST | `/payments/qpay/callback?order=…&sig=…` | QPay → us. HMAC-signed URL; the payment is confirmed with QPay's `payment/check`, never trusted from the call |
| POST | `/payments/demo/paid` · `/expired` · `/error` `{ number }` | **DEMO_MODE=true only**, 404 otherwise |

- Env: `QPAY_BASE_URL` (sandbox `https://merchant-sandbox.qpay.mn/v2` by default, production
  `https://merchant.qpay.mn/v2`), `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE`, `DEMO_MODE`,
  `PUBLIC_API_URL` (callback base — must be reachable by QPay in production).
- A payment marks the order `PAID` once QPay's paid amount covers the total, deducts stock (once, even if
  the callback and polling race) and records the QPay payment id.
- Expiry: invoices last 15 minutes. A throttled sweep (run on order reads) expires stale `PENDING` orders
  after a 2-minute grace, checking real invoices with QPay one last time so a late payment isn't lost.
- `DEMO_MODE=true`: no QPay calls; invoices get a locally drawn QR and the bank deep links, and the demo
  endpoints simulate the outcome. Without QPay credentials and with demo off, invoice requests answer 503.

## Dashboard (`/admin`, staff session)

| Method | Path | |
| --- | --- | --- |
| POST | `/admin/auth/login` (`email`, `password`, `remember`), `/admin/auth/logout` · GET `/admin/auth/me` | |
| GET | `/admin/stats/overview?days=7\|30\|90&today=` | KPIs, revenue series, status donut, top categories/products |
| GET | `/admin/stats/report?period=day\|week\|month&today=` | rows + category/brand splits (sum to revenue) |
| GET | `/admin/orders` | `stage`, `q` (number, name, phone), `payment`, `refunded`, `delivery`, `from`, `to`, `customerId`, paging; includes `stageCounts` for the tabs |
| GET | `/admin/orders/:number` | with internal notes |
| POST | `/admin/orders/:number/status` | `{ status: PAID \| PREPARING \| SHIPPING \| DELIVERED \| PENDING \| EXPIRED }` |
| POST | `/admin/orders/:number/cancel` | `{ reason, comment }` — paid orders are refunded, stock returns |
| POST | `/admin/orders/:number/notes`, `/admin/orders/bulk-status` | |
| POST | `/admin/orders/:number/check` | staff "QPay төлөв шалгах": asks QPay (or demo state) for a pending order, returns the order |
| GET/POST | `/admin/products` | list incl. hidden (`stockLevel=ok\|low\|out`, `active`), items are full details with fitments / create |
| GET/PATCH/DELETE | `/admin/products/:id` | PATCH is partial; `fitments` replaces the list; stock changes are logged |
| POST | `/admin/products/bulk` | `activate`, `hide`, `delete`, `price` (up/down %, fixed), `stock` (add/set) |
| GET/POST, PATCH/DELETE | `/admin/categories`, `/admin/brands`, `/admin/vehicles` (+ `/import` CSV) | in-use categories/brands can't be deleted (409) |
| GET | `/admin/stock` · POST `/admin/stock/adjust` | movement history / `{ productId, delta, reason }` |
| GET/POST, PATCH/DELETE | `/admin/banners` (+ POST `/reorder`), `/admin/campaigns` (PUT) | |
| GET | `/admin/customers`, `/admin/customers/:id` | spend = paid orders |
| GET | `/admin/settings` · PUT `/admin/settings/:key` (`store`, `delivery`, `qpay`) | ADMIN only to save; QPay secrets stay in env |
| GET/POST, PATCH/DELETE | `/admin/staff` | ADMIN only to change; invite returns a temporary password |
| POST | `/admin/qpay-test` | ADMIN: request a QPay token with the env credentials → `{ ok, message }` |

Stock moves automatically: a payment deducts the order's items ("Борлуулалт · #A…"), a refund-cancel
returns them ("Буцаалт · #A…"); every change is a `StockMovement` row and stock never goes below 0.
