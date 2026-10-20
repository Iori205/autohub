import type {
  AdminOrderDto,
  BannerDto,
  BrandDto,
  CampaignDto,
  CategoryDto,
  CustomerDto,
  DeliverySettings,
  Fuel as FuelCode,
  ProductDetailDto,
  QPaySettingsDto,
  StaffDto,
  StockMovementDto,
  StoreSettings,
  VehicleDto,
} from "@repo/types";
import { dotted, ubTs } from "../format";
import type {
  AdminUser,
  Banner,
  Brand,
  Campaign,
  Category,
  Customer,
  DeliveryKind,
  Fuel,
  IconKey,
  Order,
  Product,
  Session,
  Settings,
  StockMove,
  Vehicle,
} from "../types";

/* API DTO (packages/types) ↔ самбарын харагдацын бүтэц. */

export const FUEL: Record<FuelCode, Fuel> = { PETROL: "Бензин", DIESEL: "Дизель", HYBRID: "Хайбрид", ELECTRIC: "Цахилгаан" };
export const FUEL_CODE = Object.fromEntries(Object.entries(FUEL).map(([k, v]) => [v, k])) as Record<Fuel, FuelCode>;

const DELIVERY: Record<AdminOrderDto["deliveryMethod"], DeliveryKind> = { UB: "ub", PICKUP: "pickup", COUNTRY: "country" };

export const years = (from: number, to: number) => (from === to ? String(from) : `${from}–${to}`);

export const toProduct = (d: ProductDetailDto): Product => ({
  id: d.id,
  name: d.name,
  brand: d.brand.name,
  category: d.category.slug,
  oem: d.oemNumbers,
  price: d.price,
  oldPrice: d.oldPrice,
  stock: d.stock,
  threshold: d.lowStockThreshold,
  genuine: d.type === "ORIGINAL",
  active: d.active,
  description: d.description,
  specs: d.specs,
  fits: d.fitments.map((f) => ({
    make: f.make,
    model: f.model,
    engine: f.engine,
    years: years(f.yearFrom, f.yearTo),
    vehicleId: f.vehicleId,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
  })),
  images: d.images,
});

export const toCategory = (c: CategoryDto): Category => ({ id: c.id, key: c.slug, name: c.name, icon: c.icon as IconKey });

export const toBrand = (b: BrandDto): Brand => ({
  id: b.id,
  name: b.name,
  country: b.country,
  kind: b.kind === "ORIGINAL" ? "oem" : "aftermarket",
});

export const toVehicle = (v: VehicleDto & { productCount?: number }): Vehicle => ({
  id: v.id,
  make: v.make,
  model: v.model,
  gen: v.generation,
  yearFrom: v.yearFrom,
  yearTo: v.yearTo,
  engine: v.engine,
  fuel: FUEL[v.fuel],
  productCount: v.productCount ?? 0,
});

export const toCustomer = (c: CustomerDto): Customer => ({
  id: c.id,
  isGuest: c.isGuest,
  name: c.name ?? "",
  phone: c.phone ?? "",
  email: c.email ?? "",
  registeredAt: ubTs(c.createdAt).slice(0, 10),
  address: c.address ?? "",
  cars: c.cars.map((x) => ({ make: x.make, model: x.model, year: String(x.year), engine: x.engine })),
});

export function toOrder(o: AdminOrderDto): Order {
  const ts = (iso: string | null) => (iso ? ubTs(iso) : undefined);
  return {
    id: o.number,
    createdAt: ubTs(o.createdAt),
    customerId: o.customerId ?? "",
    customer: o.customer,
    car: o.car,
    note: o.note,
    items: o.items.map((it) => ({ productId: it.productId ?? 0, name: it.name, oem: it.oem, price: it.price, qty: it.qty })),
    subtotal: o.subtotal,
    shipping: o.shippingFee,
    total: o.total,
    delivery: DELIVERY[o.deliveryMethod],
    address: o.address,
    status: o.stage,
    paid: o.paymentStatus === "PAID" || o.refunded,
    invoiceId: o.qpayInvoiceId,
    paymentId: o.qpayPaymentId,
    cancelReason: o.cancelReason,
    times: {
      pending: ubTs(o.createdAt),
      paid: ts(o.paidAt),
      preparing: ts(o.preparingAt),
      shipping: ts(o.shippingAt),
      delivered: ts(o.deliveredAt),
      cancelled: ts(o.cancelledAt),
      expired: ts(o.expiredAt),
    },
    notes: o.notes.map((n) => ({ text: n.text, by: n.authorName, at: ubTs(n.createdAt) })),
  };
}

export const toStockMove = (m: StockMovementDto): StockMove => ({
  id: m.id,
  at: ubTs(m.createdAt),
  productId: m.productId,
  productName: m.productName,
  delta: m.delta,
  reason: m.reason,
  by: m.actorName,
  after: m.stockAfter,
});

export const toBanner = (b: BannerDto): Banner => ({
  id: b.id,
  eyebrow: b.eyebrow,
  title: b.title,
  sub: b.subtitle,
  cta: b.ctaLabel,
  link: b.link,
  order: b.sortOrder,
  active: b.active,
});

export const toCampaign = (c: CampaignDto): Campaign => ({
  id: c.id,
  name: c.name,
  pct: c.percent,
  target: c.targetLabel,
  categoryId: c.categoryId,
  brandId: c.brandId,
  from: c.startsAt,
  to: c.endsAt,
  active: c.active,
});

export const toSettings = (s: { store: StoreSettings; delivery: DeliverySettings; qpay: QPaySettingsDto }): Settings => ({
  store: s.store,
  zones: s.delivery.zones,
  freeOver: s.delivery.freeOver,
  qpay: {
    invoiceCode: s.qpay.invoiceCode,
    env: s.qpay.env,
    demo: s.qpay.demoMode,
    callbackUrl: s.qpay.callbackUrl,
    merchantConfigured: s.qpay.merchantConfigured,
  },
});

export const toAdmin = (s: StaffDto): AdminUser => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: s.role === "ADMIN" ? "admin" : "operator",
  lastSeen: s.lastSeenAt ? dotted(ubTs(s.lastSeenAt)) : "Нэвтрээгүй",
});

export const toSession = (s: StaffDto): Session => ({
  userId: s.id,
  name: s.name,
  email: s.email,
  role: s.role === "ADMIN" ? "admin" : "operator",
});
