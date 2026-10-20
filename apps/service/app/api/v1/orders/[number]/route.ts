import { prisma } from "@repo/db";
import type { OrderDto } from "@repo/types";
import { currentCustomer } from "@/lib/auth";
import { notFound, ok, route } from "@/lib/http";
import { orderDto, orderInclude } from "@/lib/serialize";
import { sweepExpired } from "@/lib/payments";

/** Сессийн өөрийн захиалга (төлбөр, амжилттай, дэлгэрэнгүй хуудас). */
export const GET = route<RouteContext<"/api/v1/orders/[number]">>(async (req, { params }) => {
  await sweepExpired();
  const number = (await params).number.toUpperCase();
  const user = await currentCustomer(req);
  const o = user ? await prisma.order.findFirst({ where: { number, userId: user.id }, include: orderInclude }) : null;
  if (!o) throw notFound("Захиалга олдсонгүй");
  return ok<OrderDto>(orderDto(o));
});
