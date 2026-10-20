# AuToHub

Авто сэлбэгийн онлайн дэлгүүр — Turborepo monorepo (npm workspaces).

## Бүрэлдэхүүн

### Апп-ууд

- `apps/web` — дэлгүүр ([Next.js](https://nextjs.org/), http://localhost:3000)
- `apps/dashboard` — админ самбар (Next.js, http://localhost:3001)
- `apps/service` — API (Next.js route handler, http://localhost:4000); [apps/service/README.md](apps/service/README.md)
- `apps/e2e` — бүх стекийн Playwright тест

### Багцууд

- `@repo/db` — Prisma схем, migration, seed, клиент
- `@repo/types` — API-ийн DTO ба zod шалгалт
- `@repo/ui` — нийтлэг дизайн токен (theme.css)
- `@repo/eslint-config` — `eslint` тохиргоо (`@next/eslint-plugin-next`, `eslint-config-prettier` орсон)
- `@repo/typescript-config` — monorepo даяар хэрэглэх `tsconfig.json`-ууд

Бүх багц/апп 100% [TypeScript](https://www.typescriptlang.org/).

## Эхлэх

```sh
npm install
cp .env.example .env      # утгуудыг бөглөнө (тайлбар файл дотор)
npm run db:migrate
npm run db:seed
npm run dev               # web, dashboard, service гурвууланг асаана
```

Тус бүрийг асаах: `npm run web`, `npm run dash`, `npm run service`.

## Build ба шалгалт

```sh
npm run build             # бүх апп, багц
npm run check-types
npm run lint
npm run test:e2e          # түр локал DB дээр web + dashboard
```

Тодорхой багцыг [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)-ээр:

```sh
npx turbo build --filter=web
npx turbo dev --filter=service
```

## Байршуулах

Vercel + Supabase-д байршуулах алхмууд: [DEPLOY.md](DEPLOY.md).

## Remote Caching

> [!TIP]
> Vercel Remote Cache бүх төлөвлөгөөнд үнэгүй.

Turborepo [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)-ээр build-ийн кэшийг баг болон
CI/CD-тэй хуваалцаж чадна. Анхдагчаар кэш локалд хадгалагдана. Идэвхжүүлэхийн тулд Vercel бүртгэлээр нэвтэрч repo-гоо холбоно:

```sh
npx turbo login
npx turbo link
```

## Хэрэгтэй холбоосууд

- [Task-ууд](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Кэш](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Тохиргооны сонголтууд](https://turborepo.dev/docs/reference/configuration)
- [CLI](https://turborepo.dev/docs/reference/command-line-reference)
