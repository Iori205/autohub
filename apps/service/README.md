# AuToHub API (apps/service)

Next.js route handlers under `/api/v1`, on **http://localhost:4000**. Data comes from
`@repo/db` (Prisma/PostgreSQL); request bodies and responses are typed in `@repo/types`.

```bash
npm run dev -w service        # reads the root .env (DATABASE_URL, AUTH_SECRET, …)
npm run test:api -w service   # end-to-end checks; needs a freshly seeded dev DB
```

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
zone settings). QPay invoices, callback and polling arrive in Step 3.

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
| GET/POST | `/admin/products` | list incl. hidden (`stockLevel=ok\|low\|out`, `active`) / create |
| GET/PATCH/DELETE | `/admin/products/:id` | PATCH is partial; `fitments` replaces the list; stock changes are logged |
| POST | `/admin/products/bulk` | `activate`, `hide`, `delete`, `price` (up/down %, fixed), `stock` (add/set) |
| GET/POST, PATCH/DELETE | `/admin/categories`, `/admin/brands`, `/admin/vehicles` (+ `/import` CSV) | in-use categories/brands can't be deleted (409) |
| GET | `/admin/stock` · POST `/admin/stock/adjust` | movement history / `{ productId, delta, reason }` |
| GET/POST, PATCH/DELETE | `/admin/banners` (+ POST `/reorder`), `/admin/campaigns` (PUT) | |
| GET | `/admin/customers`, `/admin/customers/:id` | spend = paid orders |
| GET | `/admin/settings` · PUT `/admin/settings/:key` (`store`, `delivery`, `qpay`) | ADMIN only to save; QPay secrets stay in env |
| GET/POST, PATCH/DELETE | `/admin/staff` | ADMIN only to change; invite returns a temporary password |

Stock moves automatically: a payment deducts the order's items ("Борлуулалт · #A…"), a refund-cancel
returns them ("Буцаалт · #A…"); every change is a `StockMovement` row and stock never goes below 0.
