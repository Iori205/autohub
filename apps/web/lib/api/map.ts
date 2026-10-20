import type {
  CartDto,
  CategoryDto,
  OrderDto,
  ProductDetailDto,
  ProductSummaryDto,
  VehicleDto,
} from "@repo/types";
import type { CartLine, Category, CategoryKey, Order, PayStatus, Product, VehicleModel } from "../types";

/* API (apps/service) → дэлгүүрийн төрлүүд; хуудас, компонентууд эдгээр бүтэцтэй ажилладаг. */

export function toProduct(p: ProductSummaryDto | ProductDetailDto): Product {
  const specs = "specs" in p ? p.specs.map((s) => [s.k, s.v] as [string, string]) : [];
  return {
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    category: p.category.slug as CategoryKey,
    oem: p.oemNumbers[0] ?? "",
    crossRefs: p.oemNumbers.slice(1),
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    stock: p.stock,
    genuine: p.type === "ORIGINAL",
    fits: p.fitsModels,
    fitUnknown: p.fitmentUnknown || undefined,
    specs,
    images: p.images.length ? p.images : undefined,
  };
}

export const toCategory = (c: CategoryDto): Category => ({
  key: c.slug as CategoryKey,
  name: c.name,
  countLabel: c.countLabel ?? `${c.productCount} бараа`,
});

/** Машины мөрүүд (хөдөлгүүр бүрт нэг) → make + model бүрт хөдөлгүүрүүдтэйгээ нэг бичлэг. */
export function toVehicleModels(rows: VehicleDto[]): VehicleModel[] {
  const map = new Map<string, VehicleModel>();
  for (const v of rows) {
    const key = `${v.make}|${v.model}`;
    const m = map.get(key);
    if (!m) map.set(key, { make: v.make, model: v.model, yearFrom: v.yearFrom, yearTo: v.yearTo, engines: [v.engine] });
    else {
      m.yearFrom = Math.min(m.yearFrom, v.yearFrom);
      m.yearTo = Math.max(m.yearTo, v.yearTo);
      if (!m.engines.includes(v.engine)) m.engines.push(v.engine);
    }
  }
  return [...map.values()];
}

export const toCartLines = (c: CartDto): CartLine[] => c.items.map((l) => ({ product: toProduct(l.product), qty: l.qty }));

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Хэрэглэгчийн цуцалсан төлбөр CANCELLED нэхэмжлэхтэй EXPIRED болж ирнэ. */
function payStatus(o: OrderDto): PayStatus {
  if (o.paymentStatus === "PAID") return "paid";
  if (o.paymentStatus === "CANCELLED") return "cancelled";
  if (o.paymentStatus === "EXPIRED") return o.invoiceStatus === "CANCELLED" ? "cancelled" : "expired";
  return "pending";
}

const STAGE = { NONE: 1, PREPARING: 2, SHIPPING: 3, DELIVERED: 4 } as const;

export function toOrder(o: OrderDto): Order {
  const ps = payStatus(o);
  return {
    no: o.number,
    items: o.items.map((i) => ({ productId: i.productId ?? 0, name: i.name, price: i.price, qty: i.qty })),
    subtotal: o.subtotal,
    shipping: o.shippingFee,
    total: o.total,
    name: o.customer.name,
    phone: o.customer.phone,
    email: o.customer.email ?? undefined,
    note: o.note ?? undefined,
    delivery: o.deliveryMethod === "PICKUP" ? "pickup" : "ship",
    address: o.address,
    created: ms(o.createdAt),
    payStatus: ps,
    stage: ps === "paid" ? STAGE[o.deliveryStatus] : 0,
    invoice: { id: o.qpayInvoiceId ?? "", created: ms(o.createdAt), expires: ms(o.invoiceExpiresAt) },
    paidAt: o.paidAt ? ms(o.paidAt) : undefined,
    txn: o.qpayPaymentId ?? undefined,
  };
}
