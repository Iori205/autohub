import { prisma } from "@repo/db";
import { createOrderInput, type OrderDto } from "@repo/types";
import { currentCustomer, customerOrGuest } from "@/lib/auth";
import { ApiError, body, created, ok, route } from "@/lib/http";
import { createOrder } from "@/lib/orders";
import { orderDto, orderInclude } from "@/lib/serialize";
import { sweepExpired } from "@/lib/payments";

/** «Миний захиалгууд»: энэ сесс/бүртгэлээс өгсөн захиалгууд, хамгийн шинэ нь эхэндээ. */
export const GET = route(async (req) => {
  await sweepExpired();
  const user = await customerOrGuest(req);
  const rows = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: orderInclude });
  return ok<OrderDto[]>(rows.map(orderDto));
});

/**
 * Checkout: `items` эсвэл сессийн сагснаас PENDING захиалга үүсгээд сагсыг хоосолно.
 * Зөвхөн бүртгэлтэй хэрэглэгч — зочин эхлээд бүртгүүлэх эсвэл нэвтэрнэ (хоёуланд нь сагс хадгалагдана).
 */
export const POST = route(async (req) => {
  const user = await currentCustomer(req);
  if (!user || user.isGuest) throw new ApiError("UNAUTHORIZED", "Захиалга өгөхийн тулд нэвтэрнэ үү");
  const input = await body(req, createOrderInput);
  const order = await createOrder(user, input);
  return created<OrderDto>(orderDto(order));
});
