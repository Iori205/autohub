import { prisma } from "@repo/db";
import type { OrderDto } from "@repo/types";
import { currentCustomer } from "@/lib/auth";
import { notFound, ok, route } from "@/lib/http";
import { orderDto, orderInclude } from "@/lib/serialize";
import { sweepExpired } from "@/lib/payments";

/** One of the session's own orders (payment page, success page, order detail). */
export const GET = route<RouteContext<"/api/v1/orders/[number]">>(async (req, { params }) => {
  await sweepExpired();
  const number = (await params).number.toUpperCase();
  const user = await currentCustomer(req);
  const o = user ? await prisma.order.findFirst({ where: { number, userId: user.id }, include: orderInclude }) : null;
  if (!o) throw notFound("Захиалга олдсонгүй");
  return ok<OrderDto>(orderDto(o));
});
