# AuToHub-ийг байршуулах (Vercel + Supabase)

Нэг repo-оос Vercel-ийн гурван төсөл, нэг Supabase Postgres.

```
хөтөч ──► web.vercel.app/api/*   ──rewrite──►  service.vercel.app/api/*  ──►  Supabase (pooler :6543)
хөтөч ──► admin.vercel.app/api/* ──rewrite──►  service.vercel.app/api/*
QPay ──────────────────────────────────────►  service.vercel.app/api/v1/payments/qpay/callback
```

Frontend бүр `/api/*`-ийг сервис рүү прокси хийдэг (`next.config.js` → `API_URL`). Хөтөч зөвхөн өөрийн нээсэн
сайттай ярьдаг тул сессийн күүки тэнд first-party байна. Тусдаа `*.vercel.app` домэйнууд күүки хуваалцаж чаддаггүй
(vercel.app бол public suffix), хөтөч гуравдагч талын күүкиг хаадаг — хөтөч → сервис шууд холболттой бол бүх
нэвтрэлт, зочны сагс, админы сесс алдагдана. Frontend-ийн сервер талын fetch нь `API_URL` руу шууд явна.

## 1. Өгөгдлийн сан (нэг удаа, өөрийн компьютерээс)

```bash
# .env: DIRECT_URL = Supabase-ийн шууд эсвэл session pooler мөр (порт 5432)
npm run db:migrate     # бүх migration, үүнд 20261020010000_login_throttle
npm run db:seed        # зөвхөн демо өгөгдлийн санд; эхлээд бүгдийг устгана
```

Vercel-ийн build үед migration хэзээ ч ажиллахгүй.

## 2. Vercel-ийн төслүүд

Эхлээд сервисийг үүсгэнэ; frontend-үүдэд түүний URL хэрэгтэй.

| | service | web | dashboard |
| --- | --- | --- | --- |
| Root Directory | `apps/service` | `apps/web` | `apps/dashboard` |
| Framework | Next.js | Next.js | Next.js |
| Build Command | анхдагч (`npm run build` = `prisma generate` + `next build`) | анхдагч | анхдагч |
| Install Command | анхдагч (npm workspaces, repo-ийн язгуурт) | анхдагч | анхдагч |
| Node.js | 24.x (`engines`-ээс) | 24.x | 24.x |
| Function region | Supabase-тэй ижил бүс (жишээ нь ap-southeast-1-д `sin1`) | ижил | ижил |

«Include files outside the root directory»-г асаалттай үлдээнэ (анхдагч); апп-ууд `packages/*`-ийг импортолдог.

### Орчны хувьсагчид (Production, preview ашиглавал Preview-д ч)

Аль нь ч `NEXT_PUBLIC_` биш; хөтөч рүү юу ч гарахгүй.

**service**

| Хувьсагч | Утга |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → «Transaction pooler» (порт **6543**) |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `PUBLIC_API_URL` | сервисийн өөрийн URL, жишээ нь `https://autohub-service.vercel.app` (https) |
| `DEMO_MODE` | `false`; заавал тодорхой заана (`true` = хуурамч төлбөр, зөвхөн демо) |
| `QPAY_BASE_URL` | `https://merchant.qpay.mn/v2` (sandbox: `https://merchant-sandbox.qpay.mn/v2`) |
| `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE` | QPay-ээс (`DEMO_MODE=false` үед заавал) |
| `DATABASE_POOL_MAX` | заавал биш, Vercel дээр instance бүрт анхдагч 3 |
| `CORS_ORIGINS`, `COOKIE_DOMAIN` | тохируулахгүй |

Сервис instance асах бүрт эдгээрийг шалгана (`instrumentation.ts`): дутуу эсвэл аюултай утга байвал үйлчлэхээс
татгалзаж, асуудлуудын жагсаалтыг log-д бичнэ.

**web** ба **dashboard**

| Хувьсагч | Утга |
| --- | --- |
| `API_URL` | сервисийн URL, жишээ нь `https://autohub-service.vercel.app` |

`API_URL` build үед хэрэгтэй (rewrite-ууд `next build`-ээр тогтдог); байхгүй бол build унана.

## 3. Анхны байршуулалтын дараа

- Самбар → Тохиргоо → QPay → «Холболт шалгах» (QPay-ийн мэдээллийг шалгана).
- Жижиг жинхэнэ захиалга өгч QPay callback ирж байгааг шалгана (сервисийн log:
  `/api/v1/payments/qpay/callback`).
- Deployment Protection: production URL нийтэд нээлттэй байх ёстой — QPay сервисийг дууддаг, frontend-үүд түүн рүү
  прокси хийдэг. Preview-г хамгаалсан ч preview ажиллана: тэд `API_URL` руу прокси хийдэг.
- Preview орчин Preview-д өгсөн `DATABASE_URL`-ийг ашиглана. Preview production өгөгдөлд хүрэхгүй байх ёстой бол
  тусдаа Supabase төсөл/branch ашиглана.

## Тэмдэглэл

- Өөрийн домэйн (жишээ нь `autohub.mn`, `admin.autohub.mn`) кодын өөрчлөлт шаардахгүй; хоёуланд нэг күүки хуваалцуулах
  гэхгүй бол `COOKIE_DOMAIN`-ийг хоосон үлдээнэ.
- Барааны зураг data URL хэлбэрээр бараатай хамт хадгалагдана (самбарт ≤1280 px JPEG болгож багасгадаг). Vercel
  хүсэлт/хариуг 4.5 MB-аар хязгаарладаг тул зураг олширвол админы барааны жагсаалт энэ хязгаарт хүрнэ.
  Каталог томрохоос өмнө зургийг Supabase Storage руу шилжүүлнэ.
