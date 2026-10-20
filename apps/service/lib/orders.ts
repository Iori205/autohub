import { prisma, type Order, type Prisma, type User } from "@repo/db";
import type { CreateOrderInput } from "@repo/types";
import { ApiError, conflict, notFound } from "./http";
import { adminOrderInclude, orderInclude } from "./serialize";
import { deliveryFee, getSetting, PICKUP_ADDRESS } from "./settings";

export const INVOICE_TTL_MS = 15 * 60e3;
type Tx = Prisma.TransactionClient;

/* ---------- checkout ---------- */

/** Өгсөн мөрүүдээс (эсвэл сессийн сагснаас) PENDING захиалга үүсгэнэ. Үнийг клиентээс биш, өгөгдлийн сангаас авна. */
export async function createOrder(user: User, input: CreateOrderInput) {
  const cart = input.items ? null : await prisma.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
  const lines = input.items ?? cart?.items.map((i) => ({ productId: i.productId, qty: i.qty })) ?? [];
  if (!lines.length) throw new ApiError("BAD_REQUEST", "Сагс хоосон байна");

  // давхардсан мөрүүдийг нэгтгэнэ
  const qty = new Map<number, number>();
  for (const l of lines) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.qty);

  const products = await prisma.product.findMany({ where: { id: { in: [...qty.keys()] }, active: true } });
  const missing = [...qty.keys()].filter((id) => !products.some((p) => p.id === id));
  if (missing.length) throw new ApiError("CONFLICT", "Зарим бараа дэлгүүрт байхгүй болсон байна", { items: missing.join(",") });

  const items = products.map((p) => ({ productId: p.id, name: p.name, oem: p.oemNumbers[0] ?? null, price: p.price, qty: qty.get(p.id)! }));
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const shippingFee = deliveryFee(input.delivery.method, subtotal, await getSetting("delivery"));
  const d = input.delivery;
  const address =
    d.method === "PICKUP" ? PICKUP_ADDRESS : d.method === "UB" ? [d.district, d.khoroo, d.address].filter(Boolean).join(", ") : d.address!;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: user.id,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerEmail: input.customer.email ?? null,
        note: input.note || null,
        car: input.car || null,
        deliveryMethod: d.method,
        address,
        district: d.method === "UB" ? (d.district ?? null) : null,
        khoroo: d.method === "UB" ? (d.khoroo ?? null) : null,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        invoiceExpiresAt: new Date(Date.now() + INVOICE_TTL_MS),
        items: { create: items },
      },
      include: orderInclude,
    });
    if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    // нэрийг дараагийн удаад санана (зочинд хараахан нэр байхгүй)
    if (!user.name) await tx.user.update({ where: { id: user.id }, data: { name: input.customer.name } });
    return order;
  });
}

/* ---------- нөөц ---------- */

/** Нөөцийн өөрчлөлтийг transaction дотор хийж бүртгэнэ. Нөөц хэзээ ч 0-ээс доош орохгүй. */
export async function moveStock(
  tx: Tx,
  productId: number,
  delta: number,
  reason: string,
  actor: { id: string | null; name: string },
  orderId: string | null = null,
) {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (!row) return;
  const after = Math.max(0, row.stock + delta);
  await tx.product.update({ where: { id: productId }, data: { stock: after } });
  await tx.stockMovement.create({
    data: { productId, delta: after - row.stock, reason, orderId, actorId: actor.id, actorName: actor.name, stockAfter: after },
  });
}

/* ---------- төлбөр ---------- */

/**
 * PENDING/EXPIRED → PAID. Нөөцийг ганц удаа хасна (QPay callback ба polling зэрэг ирэхэд төлөвийн шалгалт давхардлаас сэргийлнэ).
 * Захиалга төлөх боломжгүй болсон бол false буцаана.
 */
export async function markPaid(
  orderId: string,
  opts: { paymentId?: string | null; actor?: { id: string | null; name: string } } = {},
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: ["PENDING", "EXPIRED"] } },
      data: { paymentStatus: "PAID", paidAt: new Date(), expiredAt: null, qpayPaymentId: opts.paymentId ?? undefined },
    });
    if (!res.count) return false;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const it of order.items)
      if (it.productId)
        await moveStock(tx, it.productId, -it.qty, `Борлуулалт · #${order.number}`, opts.actor ?? { id: null, name: "Систем" }, order.id);
    return true;
  });
}

/* ---------- ажилтны үйлдэл ---------- */

type Actor = Pick<User, "id" | "name">;
const actorOf = (u: Actor) => ({ id: u.id, name: u.name ?? "Админ" });

export async function findOrder(number: string) {
  const o = await prisma.order.findUnique({ where: { number: number.toUpperCase() }, include: adminOrderInclude });
  if (!o) throw notFound("Захиалга олдсонгүй");
  return o;
}

export type StatusTarget = "PAID" | "PREPARING" | "SHIPPING" | "DELIVERED" | "PENDING" | "EXPIRED";

/**
 * Самбараас ажилтны төлөв өөрчлөх: PAID — төлбөрийг гараар баталгаажуулна (нөөц хасагдана);
 * PREPARING/SHIPPING/DELIVERED — төлөгдсөн захиалга шаардана, өмнөх алхмууд ч цагтай болно; PENDING ↔ EXPIRED — нэхэмжлэхийг дахин нээх / гараар дуусгах.
 */
export async function setStatus(o: Order, to: StatusTarget, by: Actor) {
  const now = new Date();
  if (o.paymentStatus === "CANCELLED") throw conflict("Цуцлагдсан захиалгын төлөв өөрчлөх боломжгүй");

  if (to === "PAID") {
    if (o.paymentStatus === "PAID") throw conflict("Захиалга аль хэдийн төлөгдсөн байна");
    await markPaid(o.id, { actor: actorOf(by) });
    return;
  }
  if (to === "PENDING" || to === "EXPIRED") {
    if (o.paymentStatus === "PAID") throw conflict("Төлөгдсөн захиалгыг төлбөр хүлээгдэж буй болгох боломжгүй — цуцлах уу?");
    await prisma.order.update({
      where: { id: o.id },
      data:
        to === "PENDING"
          ? { paymentStatus: "PENDING", expiredAt: null, invoiceExpiresAt: new Date(now.getTime() + INVOICE_TTL_MS) }
          : { paymentStatus: "EXPIRED", expiredAt: now },
    });
    return;
  }
  if (o.paymentStatus !== "PAID") throw conflict("Төлбөр төлөгдөөгүй захиалгыг хүргэлтэд гаргах боломжгүй");
  const steps = ["PREPARING", "SHIPPING", "DELIVERED"] as const;
  const upto = steps.indexOf(to);
  const data: Prisma.OrderUpdateInput = { deliveryStatus: to };
  if (upto >= 0 && !o.preparingAt) data.preparingAt = now;
  if (upto >= 1 && !o.shippingAt) data.shippingAt = now;
  if (upto >= 2 && !o.deliveredAt) data.deliveredAt = now;
  await prisma.order.update({ where: { id: o.id }, data });
}

/** Цуцлах; төлөгдсөн захиалгын мөнгийг QPay-ээр буцааж, нөөцийг нь буцаана. */
export async function cancelOrder(o: Order, reason: string, comment: string, by: Actor) {
  if (o.paymentStatus === "CANCELLED") throw conflict("Захиалга аль хэдийн цуцлагдсан байна");
  if (o.paymentStatus === "EXPIRED") throw conflict("Хугацаа нь дууссан захиалгыг цуцлах шаардлагагүй");
  if (o.deliveryStatus === "DELIVERED") throw conflict("Хүргэгдсэн захиалгыг цуцлах боломжгүй");
  const actor = actorOf(by);
  await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: o.id, paymentStatus: o.paymentStatus },
      data: { paymentStatus: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    if (!res.count) throw conflict("Захиалгын төлөв өөрчлөгдсөн байна — дахин ачаална уу");
    await tx.orderNote.create({ data: { orderId: o.id, authorId: actor.id, authorName: actor.name, text: `Цуцалсан: ${reason}. ${comment}` } });
    if (o.paymentStatus === "PAID") {
      const items = await tx.orderItem.findMany({ where: { orderId: o.id } });
      for (const it of items)
        if (it.productId) await moveStock(tx, it.productId, it.qty, `Буцаалт · #${o.number}`, actor, o.id);
    }
  });
}

export async function addNote(o: Order, text: string, by: Actor) {
  const a = actorOf(by);
  await prisma.orderNote.create({ data: { orderId: o.id, authorId: a.id, authorName: a.name, text } });
}
