# AuToHub API (apps/service)

`/api/v1` доорх Next.js route handler-ууд, **http://localhost:4000** дээр ажиллана. Өгөгдөл `@repo/db`-ээс
(Prisma/PostgreSQL) ирнэ; хүсэлт, хариуны төрлүүд `@repo/types`-д тодорхойлогдсон.

```bash
npm run dev -w service            # язгуурын .env-ийг уншина (DATABASE_URL, AUTH_SECRET, …)
npm run test:api -w service       # end-to-end шалгалт; шинээр seed хийсэн dev DB хэрэгтэй
npm run test:payments -w service  # QPay урсгал (MODE=demo|off|sandbox); DB-ийн ижил шаардлага
npm run test:e2e                  # (язгуураас) Playwright, web + dashboard, түр локал DB дээр
```

## Өгөгдлийн сан

```bash
npm run db:migrate   # migration хэрэгжүүлэх (DIRECT_URL)
npm run db:seed      # бүгдийг устгаад mock түүхийг өөрийн «өнөөдөр»-өөр (2026-10-11) ачаална
npm run db:demo      # бүгдийг устгаад ижил өгөгдлийг одоо руу шилжүүлж ачаална — хамгийн шинэ захиалга
                     # минутын өмнөх, өнөөдрийн KPI/график дүүрэн, хүлээгдэж буй захиалгын 15 минутын
                     # нэхэмжлэх нээлттэй. Демогийн өмнөхөн ажиллуулна.
```

Хоёр seed хоёулаа **эхлээд бүгдийг устгана** (дараа нь өгсөн захиалга ч). `20261019010000_rls_lockdown`
migration бүх хүснэгтэд Row Level Security асааж, Supabase-ийн `anon`/`authenticated` эрхийг хурааж авдаг тул
Supabase-ийн автомат REST/GraphQL API юу ч задруулахгүй; сервис хүснэгтийн эзэмшигчээр холбогддог тул нөлөөлөхгүй.

## Дүрэм

- JSON орж, JSON гарна. Өөрчлөх хүсэлт `Content-Type: application/json` илгээх ёстой.
- Алдаа: `{ "error": { "code", "message", "fields"? } }`, статус 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500.
  Шалгалтын алдаа (422) талбарын замыг монгол мессежтэй холбоно, жишээ нь `"delivery.address": "Дэлгэрэнгүй хаягаа оруулна уу"`.
- Мөнгө бүхэл төгрөг; огноо ISO тэмдэгт мөр; ажлын өдөр нь Улаанбаатарын өдөр (UTC+8).
- Frontend-үүд `/api/*`-ийг өөрийн origin-оос дуудаж энд прокси хийдэг (`next.config.js` → `API_URL`), тиймээс
  күүки first-party бөгөөд CORS оролцохгүй. `CORS_ORIGINS` (яг origin, хэзээ ч `*` биш) зөвхөн шууд cross-origin
  дуудлагад хэрэгтэй; тохируулаагүй бол dev-д localhost:3000/3001, production-д хоосон.
- Сесс нь `AUTH_SECRET`-ээр гарын үсэглэсэн httpOnly күүки (production-д Secure + SameSite=Lax + Path=/,
  прокси хийсэн frontend-ийн host-д):
  - `autohub_customer` — дэлгүүр. Сагс, хүслийн жагсаалт, захиалгыг анх ашиглахад **зочны** сесс автоматаар
    үүснэ; бүртгүүлэхэд зочин тэр чигтээ бүртгэл болж, нэвтрэхэд зочны сагс/хүслийн жагсаалт/захиалга бүртгэл рүү шилжинэ.
  - `autohub_admin_session` — самбарын ажилтан (самбарын `proxy.ts` шалгадаг нэр).
    Эрх: `OPERATOR` (захиалга, бараа, нөөц, каталог, маркетинг) ба `ADMIN` (+ тохиргоо, ажилтан).
- Нэвтрэх endpoint-ууд хязгаартай (IP + нэвтрэх нэр бүрт 15 минутад 10 амжилтгүй оролдлого); serverless
  instance бүрт хүчинтэй байхын тулд `LoginThrottle` хүснэгтэд хадгална.
- Production тохиргоог сервер асахад шалгана (`instrumentation.ts` → `validateEnv()`);
  [DEPLOY.md](../../DEPLOY.md)-г үз.

## Дэлгүүр

| Method | Path | |
| --- | --- | --- |
| GET | `/health` | ажиллаж буй эсэх + DB |
| GET | `/catalog/categories` | идэвхтэй барааны тоотой |
| GET | `/catalog/brands` | |
| GET | `/catalog/products` | `q` (нэр, брэнд эсвэл OEM — зай/зураасыг үл тооно), `category`, `brand`, `type=orig\|analog`, `inStock`, `sale`, `priceMin/Max`, тохирол `make&model&year&engine` эсвэл `vehicleId`, `sort=rec\|asc\|desc\|stock`, `page`, `pageSize` |
| GET | `/catalog/products/:id` | үзүүлэлт, тохиролтой дэлгэрэнгүй |
| GET | `/catalog/fitment` | машинд тохирох сэлбэг (ижил шүүлтүүр, хуудаслалтгүй) |
| GET | `/vehicles` | хувилбарууд; `make`, `model`, `year` |
| GET | `/vehicles/options` | сонгогчийн шат: үйлдвэрлэгч → загвар → он → хөдөлгүүр |
| GET | `/banners`, `/campaigns` | идэвхтэй нь |
| GET | `/settings` | дэлгүүрийн мэдээлэл, хүргэлтийн бүс, суурь үнэ, үнэгүй хүргэлтийн босго |
| GET/PUT/DELETE | `/cart` | авах / бүгдийг солих / хоослох |
| PUT/DELETE | `/cart/items/:productId` | `{ qty }` |
| GET | `/wishlist`; PUT/DELETE `/wishlist/:productId` | |
| GET/POST | `/orders` | миний захиалгууд / checkout (`customer`, `delivery`, `note`, `car`, `items` заавал биш — үгүй бол сагс); POST зөвхөн бүртгэлтэй хэрэглэгчид (зочинд 401) |
| GET | `/orders/:number` | миний захиалга |
| POST | `/orders/lookup` | зочны хайлт: `{ phone, number }` |
| GET | `/auth/me` · POST `/auth/register`, `/auth/login` (`login` = утас эсвэл и-мэйл), `/auth/logout` | |

Checkout 15 минутын нэхэмжлэхийн хугацаатай `PENDING` захиалга үүсгэнэ; үнэ ба хүргэлтийн төлбөрийг сервер
тооцно (УБ хүргэлт `delivery.freeOver`-оос дээш үнэгүй, очиж авах үнэгүй, орон нутгийнхыг бүсийн тохиргооноос).

## Төлбөр (QPay v2)

| Method | Path | |
| --- | --- | --- |
| POST | `/payments/qpay/invoice` `{ number }` | `{ invoiceId, qrImage (data URL), qrText, shortUrl, urls: [{ name, description, logo, link }], expiresAt, amount, demo }` — хүчинтэй нэхэмжлэхийг дахин ашиглана, үгүй бол шинэ 15 минутынхыг үүсгэнэ (хугацаа дууссан захиалгыг ч дахин нээнэ) |
| POST | `/payments/qpay/check` `{ number }` | хэдэн секунд тутам polling → `{ paymentStatus, stage, paidAt, secondsLeft }` |
| POST | `/payments/qpay/cancel` `{ number }` | «Төлбөрийг цуцлах»: нэхэмжлэх цуцлагдана, захиалга (EXPIRED) үлдэж дахин төлж болно |
| GET/POST | `/payments/qpay/callback?order=…&sig=…` | QPay → бид. HMAC гарын үсэгтэй URL; төлбөрийг QPay-ийн `payment/check`-ээр баталгаажуулна, дуудлагад дангаар нь итгэхгүй |
| POST | `/payments/demo/paid` · `/expired` · `/error` `{ number }` | **зөвхөн DEMO_MODE=true**, бусад үед 404 |

- Env: `QPAY_BASE_URL` (анхдагч нь sandbox `https://merchant-sandbox.qpay.mn/v2`, production
  `https://merchant.qpay.mn/v2`), `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE`, `DEMO_MODE`,
  `PUBLIC_API_URL` (callback-ийн суурь — production-д QPay хүрч чаддаг байх ёстой).
- QPay-ийн төлсөн дүн нийт дүнг хангамагц захиалга `PAID` болж, нөөц хасагдана (callback ба polling зэрэг ирсэн
  ч ганц удаа), QPay-ийн төлбөрийн id бүртгэгдэнэ.
- Хугацаа: нэхэмжлэх 15 минут хүчинтэй. Захиалга уншихад ажилладаг цэвэрлэгээ 2 минутын хүлээлтийн дараа хуучирсан
  `PENDING` захиалгыг EXPIRED болгох ба хоцорсон төлбөр алдагдахгүйн тулд жинхэнэ нэхэмжлэхийг QPay-ээс сүүлчийн удаа шалгана.
- `DEMO_MODE=true`: QPay дуудахгүй; нэхэмжлэх локалд зурсан QR, банкны холбоостой, демо endpoint үр дүнг дуурайна.
  Demo унтраалттай, QPay мэдээлэлгүй үед dev орчинд нэхэмжлэх 503 буцаана; production сервер ингэж асахаас татгалзана.

## Самбар (`/admin`, ажилтны сесс)

| Method | Path | |
| --- | --- | --- |
| POST | `/admin/auth/login` (`email`, `password`, `remember`), `/admin/auth/logout` · GET `/admin/auth/me` | |
| GET | `/admin/stats/overview?days=7\|30\|90&today=` | KPI, орлогын цуваа, төлөвийн дугуй график, шилдэг ангилал/бараа |
| GET | `/admin/stats/report?period=day\|week\|month&today=` | мөрүүд + ангилал/брэндийн задаргаа (орлоготой тэнцэнэ) |
| GET | `/admin/orders` | `stage`, `q` (дугаар, нэр, утас), `payment`, `refunded`, `delivery`, `from`, `to`, `customerId`, хуудаслалт; табуудад `stageCounts` |
| GET | `/admin/orders/:number` | дотоод тэмдэглэлтэй |
| POST | `/admin/orders/:number/status` | `{ status: PAID \| PREPARING \| SHIPPING \| DELIVERED \| PENDING \| EXPIRED }` |
| POST | `/admin/orders/:number/cancel` | `{ reason, comment }` — төлөгдсөн захиалгын мөнгө буцаж, нөөц эргэнэ |
| POST | `/admin/orders/:number/notes`, `/admin/orders/bulk-status` | |
| POST | `/admin/orders/:number/check` | ажилтны «QPay төлөв шалгах»: хүлээгдэж буй захиалгыг QPay-ээс (эсвэл демо төлөвөөс) асууж захиалгыг буцаана |
| GET/POST | `/admin/products` | нуусныг оруулсан жагсаалт (`stockLevel=ok\|low\|out`, `active`), мөр бүр тохиролтой бүрэн мэдээлэл / үүсгэх |
| GET/PATCH/DELETE | `/admin/products/:id` | PATCH хэсэгчилсэн; `fitments` жагсаалтыг солино; нөөцийн өөрчлөлт бүртгэгдэнэ |
| POST | `/admin/products/bulk` | `activate`, `hide`, `delete`, `price` (%-иар өсгөх/бууруулах, тогтмол), `stock` (нэмэх/тохируулах) |
| GET/POST, PATCH/DELETE | `/admin/categories`, `/admin/brands`, `/admin/vehicles` (+ `/import` CSV) | ашиглагдаж буй ангилал/брэндийг устгахгүй (409) |
| GET | `/admin/stock` · POST `/admin/stock/adjust` | хөдөлгөөний түүх / `{ productId, delta, reason }` |
| GET/POST, PATCH/DELETE | `/admin/banners` (+ POST `/reorder`), `/admin/campaigns` (PUT) | |
| GET | `/admin/customers`, `/admin/customers/:id` | зарцуулалт = төлөгдсөн захиалга |
| GET | `/admin/settings` · PUT `/admin/settings/:key` (`store`, `delivery`, `qpay`) | хадгалах нь зөвхөн ADMIN; QPay-ийн нууц утга env-д |
| GET/POST, PATCH/DELETE | `/admin/staff` | өөрчлөх нь зөвхөн ADMIN; урилга түр нууц үг буцаана |
| POST | `/admin/qpay-test` | ADMIN: env-ийн мэдээллээр QPay токен авч шалгана → `{ ok, message }` |

Нөөц автоматаар хөдөлнө: төлбөр захиалгын барааг хасна («Борлуулалт · #A…»), буцаалттай цуцлалт буцаана
(«Буцаалт · #A…»); өөрчлөлт бүр `StockMovement` мөр болж, нөөц хэзээ ч 0-ээс доош орохгүй.
