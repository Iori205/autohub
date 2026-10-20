# AuToHub дэлгүүр (apps/web)

[Next.js](https://nextjs.org) дээр бүтсэн дэлгүүр. Өгөгдлийг `apps/service`-ээс авна: хөтөч `/api/*`-ийг энэ сайтаас
дуудаж, `next.config.js` түүнийг `API_URL` руу прокси хийнэ.

## Эхлэх

Repo-ийн язгуураас (язгуурын `.env`-ийг уншина):

```bash
npm run web        # эсвэл: npm run dev -w web
```

[http://localhost:3000](http://localhost:3000)-ийг хөтчөөр нээнэ. Файлыг засахад хуудас автоматаар шинэчлэгдэнэ.

Фонтуудыг [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) автоматаар
оновчилж ачаална (Fira Sans Extra Condensed, Manrope, JetBrains Mono).

## Дэлгэцийн зураг

```bash
npm run screenshots:install -w web   # нэг удаа: Chromium-ийг node_modules-д
npm run screenshots -w web           # → apps/web/screenshots/
```

## Нэмэлт мэдээлэл

- [Next.js баримт бичиг](https://nextjs.org/docs) — Next.js-ийн боломж ба API.
- [Learn Next.js](https://nextjs.org/learn) — интерактив хичээл.

## Vercel-д байршуулах

Тохиргоо ба орчны хувьсагчид: [DEPLOY.md](../../DEPLOY.md).
