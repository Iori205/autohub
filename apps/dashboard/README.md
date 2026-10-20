# AuToHub админ самбар (apps/dashboard)

[Next.js](https://nextjs.org) дээр бүтсэн админ самбар. Өгөгдлийг `apps/service`-ээс авна: хөтөч `/api/*`-ийг энэ
сайтаас дуудаж, `next.config.js` түүнийг `API_URL` руу прокси хийнэ, тиймээс ажилтны сессийн күүки first-party.

## Эхлэх

Repo-ийн язгуураас (язгуурын `.env`-ийг уншина):

```bash
npm run dash       # эсвэл: npm run dev -w dashboard
```

[http://localhost:3001](http://localhost:3001)-ийг хөтчөөр нээнэ. Файлыг засахад хуудас автоматаар шинэчлэгдэнэ.

Фонтуудыг [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) автоматаар
оновчилж ачаална.

## Дэлгэцийн зураг

```bash
npm run screenshots:install -w dashboard   # нэг удаа: Chromium-ийг node_modules-д
npm run screenshots -w dashboard           # → apps/dashboard/screenshots/
```

## Нэмэлт мэдээлэл

- [Next.js баримт бичиг](https://nextjs.org/docs) — Next.js-ийн боломж ба API.
- [Learn Next.js](https://nextjs.org/learn) — интерактив хичээл.

## Vercel-д байршуулах

Тохиргоо ба орчны хувьсагчид: [DEPLOY.md](../../DEPLOY.md).
