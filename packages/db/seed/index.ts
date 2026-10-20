/*
 * Mock өгөгдлөөс (дэлгүүрийн каталог + захиалгын түүх) өгөгдлийн санг дүүргэнэ; эхлээд бүх хүснэгтийг цэвэрлэдэг тул дахин ажиллуулж болно.
 * npm run db:seed — mock «өнөөдөр»-ийн байдлаар. npm run db:demo — ижил өгөгдлийг одоо руу шилжүүлнэ:
 * хамгийн шинэ захиалга «одоо», өнөөдрийн KPI дүүрэн, хүлээгдэж буй захиалгын QPay нэхэмжлэх нээлттэй. Демогийн өмнөхөн ажиллуулна.
 */
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(root, ".env"), quiet: true });

const { prisma, normalizeOem } = await import("../src/index");
const { createSeed, statusTime, MOCK_TODAY } = await import("./mock/generate");
const { CATEGORIES, PRODUCTS } = await import("./mock/storefront-catalog");
import type {
  DeliveryMethod,
  DeliveryStatus,
  Fuel,
  PaymentStatus,
  Prisma,
  ProductType,
  Role,
} from "../src/generated/prisma/client";
import type { Order as MockOrder } from "./mock/types";

/** db:demo — mock цаг бүр ийм хэмжээгээр шилжинэ (зөвхөн огноотой утга бүтэн өдрөөр). */
let shiftMs = 0;
let shiftDays = 0;
/** Mock цаг нь Улаанбаатарын цаг («2026-10-11 14:32»). */
const mockTime = (ts: string) => new Date(`${ts.length === 10 ? ts + " 00:00" : ts}`.replace(" ", "T") + ":00+08:00");
const ub = (ts: string) => new Date(mockTime(ts).getTime() + shiftMs);
const date = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + shiftDays * 86_400_000);
const digits = (s: string) => s.replace(/\D/g, "");
const INVOICE_TTL_MIN = 15;

const FUEL: Record<string, Fuel> = { Бензин: "PETROL", Дизель: "DIESEL", Хайбрид: "HYBRID", Цахилгаан: "ELECTRIC" };
const DELIVERY: Record<string, DeliveryMethod> = { ub: "UB", pickup: "PICKUP", country: "COUNTRY" };
const STATUS: Record<MockOrder["status"], [PaymentStatus, DeliveryStatus]> = {
  pending: ["PENDING", "NONE"],
  paid: ["PAID", "NONE"],
  preparing: ["PAID", "PREPARING"],
  shipping: ["PAID", "SHIPPING"],
  delivered: ["PAID", "DELIVERED"],
  cancelled: ["CANCELLED", "NONE"],
  expired: ["EXPIRED", "NONE"],
};
const REACHED: Record<MockOrder["status"], MockOrder["status"][]> = {
  pending: [],
  paid: ["paid"],
  preparing: ["paid", "preparing"],
  shipping: ["paid", "preparing", "shipping"],
  delivered: ["paid", "preparing", "shipping", "delivered"],
  cancelled: [],
  expired: [],
};

async function main() {
  const m = createSeed();
  const t0 = Date.now();
  if (process.env.SEED_NOW === "1") {
    // хамгийн шинэ mock үйл явдал (захиалга, төлбөр, хүргэлтийн алхам, тэмдэглэл, нөөцийн хөдөлгөөн) нэг минутын өмнө болно
    const stamps = [
      ...m.orders.flatMap((o) => [o.createdAt, ...REACHED[o.status].map((st) => statusTime(o, st)), ...o.notes.map((n) => n.at)]),
      ...m.orders.filter((o) => o.status === "cancelled").map((o) => statusTime(o, "cancelled")),
      ...m.stockLog.map((x) => x.at),
    ];
    const latest = stamps.reduce((a, x) => (x > a ? x : a), "");
    shiftMs = Math.floor((t0 - 60_000 - mockTime(latest).getTime()) / 60_000) * 60_000;
    shiftDays = Math.round(shiftMs / 86_400_000);
  }
  // db:demo: хүлээгдэж буй захиалгууд 1½, 3, 4½… минутын өмнө, шинэ нь эхэнд
  const pendingAge = new Map(
    m.orders
      .filter((o) => o.status === "pending")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((o, i) => [o.id, (i + 1) * 90_000]),
  );
  const log = (s: string) => console.log(`  ${s.padEnd(34)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  console.log("Seeding AuToHub database…");

  // ---------- цэвэрлэх (хүүхэд хүснэгт эхэлж) ----------
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.paymentInvoice.deleteMany(),
    prisma.orderNote.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.savedCar.deleteMany(),
    prisma.productFitment.deleteMany(),
    prisma.product.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
  ]);
  log("cleared tables");

  // ---------- каталог ----------
  const countLabel = new Map(CATEGORIES.map((c) => [c.key, c.countLabel]));
  const categories = m.categories.map((c, i) => ({
    id: randomUUID(),
    slug: c.key,
    name: c.name,
    icon: c.icon,
    sortOrder: i,
    countLabel: countLabel.get(c.key as never) ?? null,
  }));
  await prisma.category.createMany({ data: categories });
  const catId = new Map(categories.map((c) => [c.slug, c.id]));
  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  const brands = m.brands.map((b) => ({
    id: randomUUID(),
    name: b.name,
    country: b.country,
    kind: (b.kind === "oem" ? "ORIGINAL" : "AFTERMARKET") as ProductType,
  }));
  await prisma.brand.createMany({ data: brands });
  const brandId = new Map(brands.map((b) => [b.name, b.id]));

  const vehicles = m.vehicles.map((v) => ({
    id: randomUUID(),
    make: v.make,
    model: v.model,
    generation: v.gen,
    yearFrom: v.yearFrom,
    yearTo: v.yearTo,
    engine: v.engine,
    fuel: FUEL[v.fuel] ?? "PETROL",
  }));
  await prisma.vehicle.createMany({ data: vehicles });
  log(`${categories.length} categories, ${brands.length} brands, ${vehicles.length} vehicles`);

  const fitUnknown = new Set(PRODUCTS.filter((p) => p.fitUnknown).map((p) => p.id));
  // «Санал болгох» = дэлгүүрийн одоо бараа жагсаадаг дараалал
  const position = new Map(PRODUCTS.map((p, i) => [p.id, i + 1]));
  await prisma.product.createMany({
    data: m.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      brandId: brandId.get(p.brand)!,
      categoryId: catId.get(p.category)!,
      oemNumbers: p.oem,
      oemSearch: p.oem.map(normalizeOem),
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      lowStockThreshold: p.threshold,
      type: (p.genuine ? "ORIGINAL" : "AFTERMARKET") as ProductType,
      images: p.images,
      specs: p.specs as unknown as Prisma.InputJsonValue,
      fitmentUnknown: fitUnknown.has(p.id),
      sortOrder: position.get(p.id) ?? p.id,
      active: p.active,
    })),
  });
  // Загварын түвшний тохирол («Land Cruiser 200, 2008–2021, бүх хөдөлгүүр») хөдөлгүүрийн хувилбар бүрт нэг мөр болно;
  // оны баганууд машиных нь хүрээтэй таарвал null үлдэнэ.
  const fitments = m.products.flatMap((p) =>
    p.fits.flatMap((f) => {
      const [y1, y2] = f.years.split("–").map(Number);
      return vehicles
        .filter((v) => v.make === f.make && v.model === f.model && (!f.engine || v.engine === f.engine))
        .map((v) => ({
          productId: p.id,
          vehicleId: v.id,
          yearFrom: y1 && y1 !== v.yearFrom ? y1 : null,
          yearTo: (y2 ?? y1) && (y2 ?? y1) !== v.yearTo ? (y2 ?? y1)! : null,
        }));
    }),
  );
  await prisma.productFitment.createMany({ data: fitments });
  log(`${m.products.length} products, ${fitments.length} fitments`);

  // ---------- хэрэглэгч ----------
  const password = process.env.SEED_ADMIN_PASSWORD || "autohub123";
  const hash = await bcrypt.hash(password, 10);
  const staff = m.admins.map((a) => ({
    id: randomUUID(),
    role: (a.role === "admin" ? "ADMIN" : "OPERATOR") as Role,
    name: a.name,
    email: a.email,
    passwordHash: hash,
  }));
  const staffByName = new Map(staff.map((s) => [s.name, s.id]));

  const seenPhone = new Set<string>();
  const customers = m.customers.map((c) => {
    let phone = digits(c.phone);
    while (seenPhone.has(phone)) phone = String(Number(phone) + 1); // mock утаснууд санамсаргүй
    seenPhone.add(phone);
    return {
      id: randomUUID(),
      mockId: c.id,
      role: "CUSTOMER" as Role,
      name: c.name,
      phone,
      email: c.email,
      address: c.address,
      createdAt: ub(c.registeredAt),
      cars: c.cars,
    };
  });
  await prisma.user.createMany({
    data: [...staff, ...customers.map(({ mockId: _m, cars: _c, ...u }) => u)],
  });
  const vehicleId = (make: string, model: string, engine: string) =>
    vehicles.find((v) => v.make === make && v.model === model && v.engine === engine)?.id ?? null;
  await prisma.savedCar.createMany({
    data: customers.flatMap((c) =>
      c.cars.map((car) => ({
        userId: c.id,
        vehicleId: vehicleId(car.make, car.model, car.engine),
        make: car.make,
        model: car.model,
        year: Number(car.year),
        engine: car.engine,
      })),
    ),
  });
  const customerByMock = new Map(customers.map((c) => [c.mockId, c]));
  log(`${staff.length} staff, ${customers.length} customers`);

  // ---------- захиалга ----------
  const oem = new Map(m.products.map((p) => [p.id, p.oem[0] ?? null]));
  const orderId = new Map<string, string>();
  const orders = m.orders.map((o) => {
    const c = customerByMock.get(o.customerId)!;
    const [paymentStatus, deliveryStatus] = STATUS[o.status];
    const reached = new Set(REACHED[o.status]);
    const at = (s: MockOrder["status"]) => ub(statusTime(o, s));
    const id = randomUUID();
    orderId.set(o.id, id);
    const car = c.cars[0];
    const created = shiftMs && pendingAge.has(o.id) ? new Date(t0 - pendingAge.get(o.id)!) : ub(o.createdAt);
    return {
      id,
      number: o.id,
      userId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
      customerEmail: c.email,
      deliveryMethod: DELIVERY[o.delivery]!,
      address: o.address,
      car: car ? `${car.make} ${car.model} ${car.year} · ${car.engine}` : null,
      subtotal: o.subtotal,
      shippingFee: o.shipping,
      total: o.total,
      paymentStatus,
      deliveryStatus,
      qpayInvoiceId: o.invoiceId,
      qpayPaymentId: o.paid ? o.paymentId : null,
      invoiceExpiresAt: new Date(created.getTime() + INVOICE_TTL_MIN * 60e3),
      paidAt: o.paid ? at("paid") : null,
      preparingAt: reached.has("preparing") ? at("preparing") : null,
      shippingAt: reached.has("shipping") ? at("shipping") : null,
      deliveredAt: reached.has("delivered") ? at("delivered") : null,
      cancelledAt: o.status === "cancelled" ? at("cancelled") : null,
      expiredAt: o.status === "expired" ? new Date(created.getTime() + INVOICE_TTL_MIN * 60e3) : null,
      createdAt: created,
    };
  });
  for (let i = 0; i < orders.length; i += 200) await prisma.order.createMany({ data: orders.slice(i, i + 200) });
  const items = m.orders.flatMap((o) =>
    o.items.map((it) => ({
      orderId: orderId.get(o.id)!,
      productId: it.productId,
      name: it.name,
      oem: oem.get(it.productId) ?? null,
      price: it.price,
      qty: it.qty,
    })),
  );
  for (let i = 0; i < items.length; i += 500) await prisma.orderItem.createMany({ data: items.slice(i, i + 500) });
  await prisma.orderNote.createMany({
    data: m.orders.flatMap((o) =>
      o.notes.map((n) => ({
        orderId: orderId.get(o.id)!,
        authorId: staffByName.get(n.by) ?? null,
        authorName: n.by,
        text: n.text,
        createdAt: ub(n.at),
      })),
    ),
  });
  log(`${orders.length} orders, ${items.length} items`);

  // ---------- нөөцийн түүх ----------
  await prisma.stockMovement.createMany({
    data: m.stockLog.map((s) => {
      const no = s.reason.match(/#(A\d+)/)?.[1];
      return {
        productId: s.productId,
        delta: s.delta,
        reason: s.reason,
        orderId: no ? (orderId.get(no) ?? null) : null,
        actorId: staffByName.get(s.by) ?? null,
        actorName: s.by,
        stockAfter: s.after,
        createdAt: ub(s.at),
      };
    }),
  });
  log(`${m.stockLog.length} stock movements`);

  // ---------- маркетинг ----------
  // Дэлгүүрийн нүүрний слайд (apps/web Hero) = идэвхтэй баннерууд, дарааллаар.
  const lc200 = m.banners.find((b) => b.title.startsWith("Land Cruiser 200"));
  await prisma.banner.createMany({
    data: [
      { eyebrow: "Prius 30 / 50", title: "Гибрид Prius-ийн бүх сэлбэг нэг дор", subtitle: "Инвертерийн насос, тоормос, шүүлтүүр — оригинал болон баталгаат аналог.", ctaLabel: "Prius сэлбэг үзэх", link: "/shop?q=Prius", sortOrder: 1, active: true },
      { eyebrow: "Хямдрал −20%", title: "Тоормосны иж бүрдэл хямдарлаа", subtitle: "Brembo, Toyota Genuine дэвсгэр — 10-р сарын 31 хүртэл.", ctaLabel: "Хямдрал үзэх", link: "/sale", sortOrder: 2, active: true },
      { eyebrow: "Өвлийн бэлтгэл", title: "−40°C-д ч найдвартай асаалт", subtitle: "Bosch аккумулятор, 0W тос, антифриз — Land Cruiser-т бэлэн.", ctaLabel: "Батарей үзэх", link: "/shop/battery", sortOrder: 3, active: true },
      { eyebrow: "Land Cruiser 200", title: lc200?.title ?? "Land Cruiser 200 сэлбэг бүгд нэг дор", subtitle: lc200?.sub ?? "", ctaLabel: "Сэлбэг үзэх", link: "/shop?q=Land+Cruiser+200", sortOrder: 4, active: false },
    ],
  });
  await prisma.campaign.createMany({
    data: m.campaigns.map((c) => {
      const [kind, name] = c.target.split(": ");
      return {
        name: c.name,
        percent: c.pct,
        target: kind === "Ангилал" ? "CATEGORY" : kind === "Брэнд" ? "BRAND" : "ALL",
        categoryId: kind === "Ангилал" ? (catByName.get(name!) ?? null) : null,
        brandId: kind === "Брэнд" ? (brandId.get(name!) ?? null) : null,
        startsAt: date(c.from),
        endsAt: date(c.to),
        active: c.active,
      } as const;
    }),
  });

  // ---------- тохиргоо (QPay-ийн нууц утга env-д) ----------
  const s = m.settings;
  await prisma.setting.createMany({
    data: [
      { key: "store", value: s.store },
      { key: "delivery", value: { zones: s.zones, freeOver: s.freeOver } },
      { key: "qpay", value: { invoiceCode: s.qpay.invoiceCode, env: s.qpay.env } },
    ] as { key: string; value: Prisma.InputJsonValue }[],
  });
  log(`4 banners, ${m.campaigns.length} campaigns, settings`);

  // ---------- sequence ----------
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX(id) FROM "Product"))`);
  const maxNo = Math.max(...m.orders.map((o) => Number(o.id.slice(1))));
  await prisma.$executeRawUnsafe(`SELECT setval('order_number_seq', ${maxNo})`);
  log(`next order number: A${maxNo + 1}`);

  console.log(
    shiftMs
      ? `\nDone. Demo data moved to the present: the newest order is now, ${pendingAge.size} pending orders were placed in the last ${pendingAge.size * 1.5} minutes (they expire 15 minutes after that).`
      : `\nDone. Mock "today" is ${MOCK_TODAY}.`,
  );
  console.log(`Staff logins (password: ${process.env.SEED_ADMIN_PASSWORD ? "$SEED_ADMIN_PASSWORD" : password}):`);
  for (const a of staff) console.log(`  ${a.role.padEnd(8)} ${a.email}`);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
