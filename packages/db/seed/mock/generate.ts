// Copied from apps/dashboard (mock data the seed is built from). Not imported by any app.
import { addMinutes, toDay } from "./format";
import type {
  AdminUser,
  Banner,
  Brand,
  Campaign,
  Category,
  CategoryKey,
  Customer,
  CustomerCar,
  Db,
  DeliveryKind,
  Fuel,
  IconKey,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Settings,
  StockMove,
  Vehicle,
} from "./types";
import { BRANDS, CATEGORIES, PRODUCTS, VEHICLES } from "./storefront-catalog";

/*
 * Mock database seed. Deterministic (seeded PRNG, fixed dates) so the server
 * and client render the same thing. Every number in the admin — revenue, KPIs,
 * reports, "sold" counts, customer totals, stock history — is derived from the
 * orders generated here, so the pages always agree with each other.
 *
 * The mock "today" is the design's date. apps/service replaces all of this.
 */
export const MOCK_TODAY = "2026-10-11";
const HISTORY_DAYS = 180;

/* ---------- storefront rules (same as apps/web/lib/catalog.ts) ---------- */

export const FREE_SHIPPING_FROM = 200000;
export const SHIPPING_FEE = 5000;
export const COUNTRY_FEE = 15000;
export const PICKUP_ADDRESS = "Хан-Уул салбар, Чингисийн өргөн чөлөө 24";

export const shippingFor = (subtotal: number, delivery: DeliveryKind) =>
  delivery === "pickup"
    ? 0
    : delivery === "country"
      ? COUNTRY_FEE
      : subtotal >= FREE_SHIPPING_FROM
        ? 0
        : SHIPPING_FEE;

/* ---------- deterministic helpers ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261011);
const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]!;
function weighted<T>(list: readonly T[], weight: (x: T) => number): T {
  const total = list.reduce((a, x) => a + weight(x), 0);
  let r = rnd() * total;
  for (const x of list) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1]!;
}
function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/* ---------- catalog ---------- */

const CATEGORY_ICON: Record<CategoryKey, IconKey> = {
  engine: "cog",
  brake: "disc",
  susp: "wrench",
  filter: "filter",
  oil: "droplet",
  elec: "lightbulb",
  battery: "battery",
  wheel: "wheel",
  body: "car",
  interior: "armchair",
  acc: "package",
};

const categories: Category[] = CATEGORIES.map((c) => ({
  key: c.key,
  name: c.name,
  icon: CATEGORY_ICON[c.key],
}));

const BRAND_META: Record<string, [string, Brand["kind"]]> = {
  "Toyota Genuine": ["Япон", "oem"],
  Denso: ["Япон", "aftermarket"],
  Bosch: ["Герман", "aftermarket"],
  Aisin: ["Япон", "aftermarket"],
  NGK: ["Япон", "aftermarket"],
  KYB: ["Япон", "aftermarket"],
  Brembo: ["Итали", "aftermarket"],
  Castrol: ["Их Британи", "aftermarket"],
  Mobil: ["АНУ", "aftermarket"],
  "Hyundai Mobis": ["Өмнөд Солонгос", "oem"],
};

const brands: Brand[] = BRANDS.map((name, i) => ({
  id: `b${i + 1}`,
  name,
  country: BRAND_META[name]?.[0] ?? "",
  kind: BRAND_META[name]?.[1] ?? "aftermarket",
}));

const CONSUMABLE = new Set<CategoryKey>(["oil", "filter"]);

/** Same description the storefront renders on the product page. */
const describe = (p: (typeof PRODUCTS)[number]) =>
  [
    `${p.brand} брэндийн ${p.name.toLowerCase()}.`,
    p.genuine
      ? "Үйлдвэрийн оригинал сэлбэг бөгөөд машины анхны тохиргоонд яг тохирно."
      : "Олон улсын чанарын стандартад нийцсэн, OEM үзүүлэлттэй ижил баталгаат аналог сэлбэг.",
    p.fits.length ? `${p.fits.join(", ")} загварт тохирно.` : "",
    "Монголын хүйтэн уур амьсгалд туршигдсан.",
  ]
    .filter(Boolean)
    .join(" ");

const products: Product[] = [...PRODUCTS]
  .sort((a, b) => a.id - b.id)
  .map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    oem: [...new Set([p.oem, ...p.crossRefs])],
    price: p.price,
    oldPrice: p.oldPrice ?? null,
    stock: p.stock,
    threshold:
      CONSUMABLE.has(p.category) || p.id === 21 ? 10 : p.price >= 400000 ? 1 : 3,
    genuine: p.genuine,
    active: true,
    description: describe(p),
    specs: p.specs.map(([k, v]) => ({ k, v })),
    fits: p.fits.flatMap((model) => {
      const v = VEHICLES.find((x) => x.model === model);
      return v
        ? [{ make: v.make, model: v.model, years: `${v.yearFrom}–${v.yearTo}`, engine: "" }]
        : [];
    }),
    images: p.images ?? [],
  }));

const GEN: Record<string, string> = {
  Prius: "XW30 · XW50",
  "Land Cruiser 200": "J200",
  "Land Cruiser Prado 150": "J150",
  Camry: "XV50 · XV70",
  "RX 350": "AL10 · AL20",
  "LX 570": "J200",
  Sonata: "LF · DN8",
  Tucson: "TL · NX4",
  "X-Trail": "T32",
  Leaf: "ZE0 · ZE1",
};

export const fuelOf = (engine: string): Fuel =>
  /electric/i.test(engine)
    ? "Цахилгаан"
    : /hybrid/i.test(engine)
      ? "Хайбрид"
      : /diesel|crdi/i.test(engine)
        ? "Дизель"
        : "Бензин";

const vehicles: Vehicle[] = VEHICLES.flatMap((v) =>
  v.engines.map((engine, i) => ({
    id: `v-${hash(v.model + engine).toString(36)}-${i}`,
    make: v.make,
    model: v.model,
    gen: GEN[v.model] ?? "",
    yearFrom: v.yearFrom,
    yearTo: v.yearTo,
    engine,
    fuel: fuelOf(engine),
  })),
);

/* ---------- customers ---------- */

const car = (model: string, year: number, engineIdx = 0): CustomerCar => {
  const v = VEHICLES.find((x) => x.model === model)!;
  return { make: v.make, model: v.model, year: String(year), engine: v.engines[engineIdx]! };
};

const core: Customer[] = [
  ["Бат-Эрдэнэ Ганбаатар", "9911-2345", "baterdene.g@gmail.com", "2025-03-14", "БЗД, 26-р хороо, Нархан хотхон 48-р байр, 3-р орц, 56 тоот", [car("Land Cruiser 200", 2015), car("Prius", 2012)]],
  ["Сарангэрэл Дорж", "8800-4512", "saraa.dorj@gmail.com", "2025-06-02", "СБД, 1-р хороо, Олимпийн гудамж 12, 41 тоот", [car("Prius", 2014)]],
  ["Тэмүүлэн Батсүх", "9505-7781", "temuulen.b@yahoo.com", "2024-11-20", "ХУД, 11-р хороо, Зайсан, Хилл хотхон 7-р байр", [car("LX 570", 2016)]],
  ["Номин-Эрдэнэ Пүрэв", "9909-1123", "nomin.p@gmail.com", "2025-08-09", "ЧД, 4-р хороо, Их тойруу 33, 18 тоот", [car("Camry", 2015)]],
  ["Ганзориг Цэрэн", "8611-0098", "ganzorig.ts@gmail.com", "2025-01-30", "Дархан-Уул, Дархан сум, 9-р баг", [car("Land Cruiser Prado 150", 2018)]],
  ["Энхжин Болд", "9191-6650", "enkhjin.bold@gmail.com", "2025-09-17", "БГД, 6-р хороо, 10-р хороолол, 2-р байр", [car("Tucson", 2017, 1)]],
  ["Мөнх-Очир Даваа", "9977-3402", "munkhochir@gmail.com", "2024-07-05", "Орхон, Баян-Өндөр сум, Оюут баг", [car("X-Trail", 2019)]],
  ["Оюунчимэг Лхагва", "8899-2210", "oyuka.lh@gmail.com", "2026-02-11", "СХД, 20-р хороо, Толгойт, 5-р байр", []],
  ["Билгүүн Түмэн", "9415-8836", "bilguun.t@gmail.com", "2025-12-01", "ХУД, 3-р хороо, Чингисийн өргөн чөлөө 41", [car("RX 350", 2016)]],
  ["Хулан Анхбаяр", "9600-1475", "khulan.a@gmail.com", "2026-04-22", "БЗД, 8-р хороо, 13-р хороолол, 22-р байр", [car("Sonata", 2018)]],
].map(([name, phone, email, registeredAt, address, cars], i) => ({
  id: `C${pad(i + 1, 3)}`,
  name: name as string,
  phone: phone as string,
  email: email as string,
  registeredAt: registeredAt as string,
  address: address as string,
  cars: cars as CustomerCar[],
}));

const FIRST: [string, string][] = [
  ["Анар", "anar"], ["Батбаяр", "batbayar"], ["Болормаа", "bolormaa"], ["Ганбат", "ganbat"],
  ["Дөлгөөн", "dulguun"], ["Жаргал", "jargal"], ["Мөнхбат", "munkhbat"], ["Нандин", "nandin"],
  ["Отгонбаяр", "otgonbayar"], ["Пүрэвдорж", "purevdorj"], ["Сүхээ", "sukhee"], ["Төгөлдөр", "tuguldur"],
  ["Уранчимэг", "uranchimeg"], ["Хонгор", "khongor"], ["Цэцэг", "tsetseg"], ["Чинзориг", "chinzorig"],
  ["Эрдэнэбат", "erdenebat"], ["Ариунаа", "ariunaa"], ["Баясгалан", "bayasgalan"], ["Гэрэлт", "gerelt"],
  ["Дашдорж", "dashdorj"], ["Золбоо", "zolboo"], ["Мишээл", "misheel"], ["Наранбаатар", "naranbaatar"],
  ["Түвшин", "tuvshin"],
];
const LAST = [
  "Бат", "Дорж", "Ганболд", "Цогт", "Лхагва", "Нямаа", "Очир", "Пүрэв", "Сүрэн", "Төмөр",
  "Эрдэнэ", "Жамц", "Баатар", "Сэргэлэн", "Мөнх",
];
const UB = [
  "БЗД, 15-р хороо, 120 мянгат, 14-р байр",
  "СБД, 8-р хороо, Их сургуулийн гудамж 3",
  "ХУД, 15-р хороо, Зайсан, 45-р байр",
  "ЧД, 6-р хороо, 3-р хороолол, 31-р байр",
  "БГД, 3-р хороо, 4-р хороолол, 9-р байр",
  "СХД, 9-р хороо, Баянхошуу, 2-р байр",
  "ХУД, 2-р хороо, Яармаг, Шинэ Яармаг хотхон",
  "БЗД, 1-р хороо, Улаанхуаран, 18-р байр",
  "СБД, 11-р хороо, Хороолол 7, 11-р байр",
  "ЧД, 18-р хороо, Хайлааст, 5-р байр",
];
const COUNTRY = [
  "Дархан-Уул, Дархан сум, 4-р баг",
  "Орхон, Баян-Өндөр сум, Шанд баг",
  "Сэлэнгэ, Сүхбаатар сум, 2-р баг",
  "Төв, Зуунмод сум, 3-р баг",
  "Өвөрхангай, Арвайхээр сум, 5-р баг",
];

const generated: Customer[] = Array.from({ length: 54 }, (_, i) => {
  const [first, lat] = FIRST[i % FIRST.length]!;
  const last = LAST[(i * 7 + 3) % LAST.length]!;
  const country = rnd() < 0.14;
  const regDay = new Date(2024, 2, 1);
  regDay.setDate(regDay.getDate() + Math.floor(rnd() * 900));
  const nCars = rnd() < 0.18 ? 0 : rnd() < 0.82 ? 1 : 2;
  const cars = Array.from({ length: nCars }, () => {
    const v = pick(VEHICLES);
    return car(v.model, v.yearFrom + Math.floor(rnd() * (v.yearTo - v.yearFrom + 1)), Math.floor(rnd() * v.engines.length));
  });
  const phone = `${pick(["99", "88", "95", "91", "80", "86", "94"])}${pad(Math.floor(rnd() * 100))}-${pad(Math.floor(rnd() * 10000), 4)}`;
  return {
    id: `C${pad(i + 11, 3)}`,
    name: `${first} ${last}`,
    phone,
    email: `${lat}${i > 24 ? i : ""}@gmail.com`,
    registeredAt: toDay(regDay),
    address: `${pick(country ? COUNTRY : UB)}${country ? "" : `, ${1 + Math.floor(rnd() * 90)} тоот`}`,
    cars,
  };
});

const customers = [...core, ...generated];
/** Addresses outside the Ulaanbaatar districts ship as "Орон нутаг". */
const isCountry = (c: Customer) => !/^(БЗД|СБД|ХУД|ЧД|БГД|СХД|НД|БНД),/.test(c.address);

/* ---------- orders ---------- */

const productById = new Map(products.map((p) => [p.id, p]));
const line = (productId: number, qty: number): OrderItem => {
  const p = productById.get(productId)!;
  return { productId, name: p.name, price: p.price, qty };
};

function makeOrder(
  id: string,
  createdAt: string,
  c: Customer,
  items: OrderItem[],
  delivery: DeliveryKind,
  status: OrderStatus,
  paid: boolean,
): Order {
  const subtotal = items.reduce((a, it) => a + it.price * it.qty, 0);
  const shipping = shippingFor(subtotal, delivery);
  const h = hash(id);
  return {
    id,
    createdAt,
    customerId: c.id,
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    delivery,
    address: delivery === "pickup" ? PICKUP_ADDRESS : c.address,
    status,
    paid,
    invoiceId: `INV-${id}-${pad(h % 1000000, 6)}`,
    paymentId: paid ? String(400000000000 + (h % 99999999999)) : null,
    times: {},
    notes: [],
  };
}

// The 22 most recent orders are the design's hand-made ones (A1003–A1024),
// mapped onto storefront products that fit each customer's car.
type CoreRow = [string, string, number, [number, number][], DeliveryKind, OrderStatus, boolean?];
const CORE: CoreRow[] = [
  ["A1024", "2026-10-11 14:32", 0, [[2, 1], [17, 1], [16, 1]], "ub", "paid"],
  ["A1023", "2026-10-11 13:05", 1, [[3, 2], [4, 1]], "ub", "pending"],
  ["A1022", "2026-10-11 11:48", 2, [[13, 2], [21, 1]], "pickup", "paid"],
  ["A1021", "2026-10-11 10:20", 3, [[5, 1]], "ub", "preparing"],
  ["A1020", "2026-10-11 09:12", 4, [[8, 2]], "country", "pending"],
  ["A1019", "2026-10-10 18:40", 5, [[12, 1], [21, 1]], "ub", "shipping"],
  ["A1018", "2026-10-10 16:02", 6, [[8, 1], [21, 1]], "country", "shipping"],
  ["A1017", "2026-10-10 13:55", 7, [[21, 2]], "pickup", "delivered"],
  ["A1016", "2026-10-10 11:30", 8, [[14, 1], [13, 1]], "ub", "cancelled", true],
  ["A1015", "2026-10-10 09:45", 9, [[14, 1], [8, 1]], "ub", "delivered"],
  ["A1014", "2026-10-09 20:10", 0, [[3, 1], [7, 1]], "ub", "delivered"],
  ["A1013", "2026-10-09 17:22", 1, [[1, 1], [24, 1]], "ub", "expired"],
  ["A1012", "2026-10-09 15:05", 2, [[18, 2], [19, 1]], "pickup", "delivered"],
  ["A1011", "2026-10-09 10:40", 4, [[15, 1]], "country", "delivered"],
  ["A1010", "2026-10-08 19:33", 3, [[14, 1]], "ub", "expired"],
  ["A1009", "2026-10-08 14:18", 5, [[23, 1]], "country", "delivered"],
  ["A1008", "2026-10-08 12:01", 6, [[8, 2], [16, 1]], "country", "delivered"],
  ["A1007", "2026-10-07 18:47", 7, [[26, 1]], "ub", "cancelled", false],
  ["A1006", "2026-10-07 11:15", 8, [[13, 1], [14, 1]], "pickup", "delivered"],
  ["A1005", "2026-10-06 16:30", 9, [[14, 2]], "ub", "delivered"],
  ["A1004", "2026-10-06 10:05", 0, [[10, 1]], "ub", "delivered"],
  ["A1003", "2026-10-05 15:50", 2, [[17, 1], [2, 1]], "ub", "delivered"],
];

const coreOrders = CORE.map(([id, at, ci, items, delivery, status, paid]) =>
  makeOrder(
    id,
    at,
    core[ci]!,
    items.map(([p, q]) => line(p, q)),
    delivery,
    status,
    paid ?? (status !== "pending" && status !== "expired"),
  ),
);
coreOrders[0]!.notes.push({
  text: "Харилцагч 17:00-оос өмнө хүргүүлэхийг хүссэн. Утсаар баталгаажуулсан.",
  by: "Сүхбат Нямдорж",
  at: "2026-10-11 14:34",
});

// Older history: ~3 orders a day for the past six months.
const WEEKDAY_FACTOR = [1.18, 0.86, 0.9, 1, 1.04, 1.14, 1.32];
const fitsCar = (p: Product, c: Customer) =>
  !c.cars.length || !p.fits.length || p.fits.some((f) => c.cars.some((x) => x.model === f.model));
const popularity = (p: Product) =>
  (CONSUMABLE.has(p.category as CategoryKey) || p.id === 21 ? 3 : 1) / Math.sqrt(p.price / 40000);

const history: Omit<Order, "id">[] = [];
const firstCore = CORE[CORE.length - 1]![1].slice(0, 10);
for (let i = HISTORY_DAYS; i >= 1; i--) {
  const d = new Date(MOCK_TODAY + "T00:00");
  d.setDate(d.getDate() - i);
  const day = toDay(d);
  if (day >= firstCore) break;
  const t = (HISTORY_DAYS - i) / HISTORY_DAYS;
  const lambda = 2.6 * WEEKDAY_FACTOR[d.getDay()]! * (0.82 + 0.36 * t) * (1 + 0.16 * Math.sin(i / 9));
  const n = poisson(lambda);
  const minutes = Array.from({ length: n }, () => 9 * 60 + Math.floor(rnd() * 12 * 60)).sort((a, b) => a - b);
  const eligible = customers.filter((c) => c.registeredAt <= day);
  for (const min of minutes) {
    const c = weighted(eligible, (x) => (x.id <= "C010" ? 2.2 : 1));
    const pool = products.filter((p) => fitsCar(p, c));
    const count = rnd() < 0.56 ? 1 : rnd() < 0.72 ? 2 : 3;
    const chosen: Product[] = [];
    while (chosen.length < Math.min(count, pool.length)) {
      const p = weighted(pool, popularity);
      if (!chosen.includes(p)) chosen.push(p);
    }
    const items = chosen.map((p) =>
      line(p.id, CONSUMABLE.has(p.category as CategoryKey) && rnd() < 0.35 ? 2 : 1),
    );
    const delivery: DeliveryKind = isCountry(c) ? "country" : rnd() < 0.24 ? "pickup" : "ub";
    const r = rnd();
    const status: OrderStatus = r < 0.05 ? "expired" : r < 0.09 ? "cancelled" : "delivered";
    const paid = status === "delivered" || (status === "cancelled" && r < 0.07);
    history.push({
      ...makeOrder("", `${day} ${pad(Math.floor(min / 60))}:${pad(min % 60)}`, c, items, delivery, status, paid),
    });
  }
}
const firstNo = 1003 - history.length;
const historyOrders: Order[] = history.map((o, k) => {
  const id = "A" + pad(firstNo + k, 4);
  return makeOrder(
    id,
    o.createdAt,
    customers.find((c) => c.id === o.customerId)!,
    o.items,
    o.delivery,
    o.status,
    o.paid,
  );
});

/** Newest first, like every list in the admin. */
const orders: Order[] = [...coreOrders, ...historyOrders.reverse()];

/** Minutes after creation at which each status is reached by default. */
export const STATUS_OFFSET: Record<OrderStatus, number> = {
  pending: 0,
  paid: 3,
  preparing: 42,
  shipping: 900,
  delivered: 1260,
  cancelled: 35,
  expired: 30,
};

/** When `status` was reached: an explicit time if one was recorded, else the default offset. */
export const statusTime = (o: Order, s: OrderStatus) =>
  o.times[s] ?? addMinutes(o.createdAt, STATUS_OFFSET[s]);

/* ---------- stock history (derived from the orders above) ---------- */

const MANUAL: [string, number, number, string, string][] = [
  ["2026-10-10 11:02", 3, 24, "Шинэ орлого · Toyota Mongolia", "Ганболд Батбаяр"],
  ["2026-10-09 16:45", 4, -1, "Гэмтэл / гологдол", "Сүхбат Нямдорж"],
  ["2026-10-09 10:10", 7, 12, "Шинэ орлого · Toyota Mongolia", "Ганболд Батбаяр"],
  ["2026-10-08 15:30", 14, -1, "Тооллогын зөрүү", "Уянга Ганхуяг"],
  ["2026-10-07 12:20", 10, 6, "Шинэ орлого · Bosch", "Ганболд Батбаяр"],
  ["2026-10-06 09:40", 8, 10, "Шинэ орлого · Castrol", "Ганболд Батбаяр"],
];

function buildStockLog(): StockMove[] {
  const moves: Omit<StockMove, "after" | "id">[] = [];
  const since = "2026-10-05";
  for (const o of orders) {
    if (o.createdAt < since || !o.paid) continue;
    const at = statusTime(o, "paid");
    for (const it of o.items)
      moves.push({ at, productId: it.productId, delta: -it.qty, reason: `Борлуулалт · #${o.id}`, by: "Систем" });
    if (o.status === "cancelled")
      for (const it of o.items)
        moves.push({ at: statusTime(o, "cancelled"), productId: it.productId, delta: it.qty, reason: `Буцаалт · #${o.id}`, by: "Ганболд Батбаяр" });
  }
  for (const [at, productId, delta, reason, by] of MANUAL) moves.push({ at, productId, delta, reason, by });
  moves.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  // Walk back from today's stock so every "after" matches the product list.
  const level = new Map(products.map((p) => [p.id, p.stock]));
  return moves.map((m, i) => {
    const after = level.get(m.productId)!;
    level.set(m.productId, after - m.delta);
    return { ...m, id: `s${moves.length - i}`, after };
  });
}

/* ---------- marketing & settings ---------- */

const lc200Count = products.filter((p) => p.fits.some((f) => f.model === "Land Cruiser 200")).length;

const banners: Banner[] = [
  { id: "bn1", title: "Өвлийн бэлтгэл — аккумулятор 15% хямдрал", sub: "Bosch · 11.30 хүртэл", link: "/shop/battery", order: 1, active: true },
  { id: "bn2", title: "Toyota оригинал тос & шүүлтүүр", sub: "Үйлдвэрийн баталгаатай", link: "/shop?brand=Toyota+Genuine", order: 2, active: true },
  { id: "bn3", title: "Land Cruiser 200 сэлбэг бүгд нэг дор", sub: `${lc200Count} бараа`, link: "/shop?q=Land+Cruiser+200", order: 3, active: false },
];

const campaigns: Campaign[] = [
  { id: "cp1", name: "Өвлийн аккумулятор", pct: 15, target: "Ангилал: Батарей", from: "2026-10-01", to: "2026-11-30", active: true },
  { id: "cp2", name: "Brembo тоормос", pct: 10, target: "Брэнд: Brembo", from: "2026-10-05", to: "2026-10-31", active: true },
  { id: "cp3", name: "Шүүлтүүрийн 7 хоног", pct: 20, target: "Ангилал: Шүүлтүүр", from: "2026-09-15", to: "2026-09-22", active: false },
  { id: "cp4", name: "Шинэ жилийн урамшуулал", pct: 12, target: "Бүх бараа", from: "2026-12-20", to: "2027-01-05", active: true },
];

// Store details match apps/web/lib/site.ts.
const settings: Settings = {
  store: {
    name: "AuToHub",
    phone: "7711-2233",
    email: "info@selbeg.mn",
    address: "Улаанбаатар, Хан-Уул дүүрэг, 15-р хороо, Чингисийн өргөн чөлөө 24",
    hours: "Даваа–Бямба 09:00–20:00",
  },
  zones: [
    { id: "z1", name: "УБ төв (6 дүүрэг)", fee: SHIPPING_FEE, eta: "24 цагийн дотор", active: true },
    { id: "z2", name: "УБ захын хороолол", fee: 8000, eta: "24–48 цаг", active: true },
    { id: "z3", name: "Орон нутаг (унаанд тавих)", fee: COUNTRY_FEE, eta: "2–4 өдөр", active: true },
    { id: "z4", name: "Дэлгүүрээс очиж авах", fee: 0, eta: "Шууд", active: true },
  ],
  freeOver: FREE_SHIPPING_FROM,
  qpay: { username: "AUTOHUB_MN", password: "qpay-secret", invoiceCode: "AUTOHUB_INVOICE", env: "sandbox", demo: true },
};

const admins: AdminUser[] = [
  { id: "u1", name: "Ганболд Батбаяр", email: "admin@autohub.mn", role: "admin", lastSeen: "Одоо идэвхтэй" },
  { id: "u2", name: "Сүхбат Нямдорж", email: "operator1@autohub.mn", role: "operator", lastSeen: "10.11 14:34" },
  { id: "u3", name: "Уянга Ганхуяг", email: "operator2@autohub.mn", role: "operator", lastSeen: "10.10 18:02" },
];

/** A fresh copy every call — the store mutates its own copy. */
export function createSeed(): Db {
  return structuredClone({
    products,
    categories,
    brands,
    vehicles,
    customers,
    orders,
    stockLog: buildStockLog(),
    banners,
    campaigns,
    settings,
    admins,
  });
}
