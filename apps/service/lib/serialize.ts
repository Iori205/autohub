import { Prisma } from "@repo/db";
import {
  orderStage,
  type AdminOrderDto,
  type CampaignDto,
  type FitmentDto,
  type OrderDto,
  type ProductDetailDto,
  type ProductSummaryDto,
  type Spec,
  type VehicleDto,
} from "@repo/types";

/* Prisma includes used with the serializers below */

export const productSummaryInclude = {
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, slug: true, name: true } },
  fitments: { select: { vehicle: { select: { model: true } } } },
} satisfies Prisma.ProductInclude;

export const productDetailInclude = {
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, slug: true, name: true } },
  fitments: { include: { vehicle: true } },
} satisfies Prisma.ProductInclude;

type SummaryRow = Prisma.ProductGetPayload<{ include: typeof productSummaryInclude }>;
type DetailRow = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

const models = (fits: { vehicle: { model: string } }[]) => [...new Set(fits.map((f) => f.vehicle.model))];

export function productSummary(p: SummaryRow | DetailRow): ProductSummaryDto {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    oemNumbers: p.oemNumbers,
    price: p.price,
    oldPrice: p.oldPrice,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    type: p.type,
    images: p.images,
    fitmentUnknown: p.fitmentUnknown,
    active: p.active,
    sortOrder: p.sortOrder,
    fitsModels: models(p.fitments),
  };
}

export function productDetail(p: DetailRow): ProductDetailDto {
  const fitments: FitmentDto[] = p.fitments
    .map((f) => ({
      vehicleId: f.vehicleId,
      make: f.vehicle.make,
      model: f.vehicle.model,
      engine: f.vehicle.engine,
      yearFrom: f.yearFrom ?? f.vehicle.yearFrom,
      yearTo: f.yearTo ?? f.vehicle.yearTo,
    }))
    .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.engine.localeCompare(b.engine));
  return {
    ...productSummary(p),
    description: p.description,
    specs: (Array.isArray(p.specs) ? p.specs : []) as unknown as Spec[],
    fitments,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const vehicleDto = (v: VehicleDto): VehicleDto => ({
  id: v.id,
  make: v.make,
  model: v.model,
  generation: v.generation,
  yearFrom: v.yearFrom,
  yearTo: v.yearTo,
  engine: v.engine,
  fuel: v.fuel,
});

/* ---------- orders ---------- */

const latestInvoice = { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true } } as const;

export const orderInclude = {
  items: { orderBy: { id: "asc" } },
  invoices: latestInvoice,
} satisfies Prisma.OrderInclude;

export const adminOrderInclude = {
  items: { orderBy: { id: "asc" } },
  notes: { orderBy: { createdAt: "asc" } },
  invoices: latestInvoice,
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type AdminOrderRow = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function orderDto(o: OrderRow): OrderDto {
  return {
    number: o.number,
    stage: orderStage(o),
    paymentStatus: o.paymentStatus,
    deliveryStatus: o.deliveryStatus,
    refunded: o.paymentStatus === "CANCELLED" && o.paidAt !== null,
    customer: { name: o.customerName, phone: o.customerPhone, email: o.customerEmail },
    deliveryMethod: o.deliveryMethod,
    address: o.address,
    district: o.district,
    khoroo: o.khoroo,
    note: o.note,
    car: o.car,
    items: o.items.map((i) => ({ productId: i.productId, name: i.name, oem: i.oem, price: i.price, qty: i.qty })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    total: o.total,
    qpayInvoiceId: o.qpayInvoiceId,
    qpayPaymentId: o.qpayPaymentId,
    invoiceStatus: o.invoices.find((i) => i.id === o.qpayInvoiceId)?.status ?? null,
    invoiceExpiresAt: iso(o.invoiceExpiresAt),
    createdAt: o.createdAt.toISOString(),
    paidAt: iso(o.paidAt),
    preparingAt: iso(o.preparingAt),
    shippingAt: iso(o.shippingAt),
    deliveredAt: iso(o.deliveredAt),
    cancelledAt: iso(o.cancelledAt),
    cancelReason: o.cancelReason,
    expiredAt: iso(o.expiredAt),
  };
}

export function adminOrderDto(o: AdminOrderRow): AdminOrderDto {
  return {
    ...orderDto(o),
    customerId: o.userId,
    notes: o.notes.map((n) => ({ id: n.id, text: n.text, authorName: n.authorName, createdAt: n.createdAt.toISOString() })),
  };
}

/* ---------- marketing ---------- */

type CampaignRow = Prisma.CampaignGetPayload<{ include: { category: true; brand: true } }>;

export function campaignDto(c: CampaignRow): CampaignDto {
  return {
    id: c.id,
    name: c.name,
    percent: c.percent,
    target: c.target,
    categoryId: c.categoryId,
    brandId: c.brandId,
    targetLabel:
      c.target === "CATEGORY" ? `Ангилал: ${c.category?.name ?? "—"}` : c.target === "BRAND" ? `Брэнд: ${c.brand?.name ?? "—"}` : "Бүх бараа",
    startsAt: c.startsAt.toISOString().slice(0, 10),
    endsAt: c.endsAt.toISOString().slice(0, 10),
    active: c.active,
  };
}
