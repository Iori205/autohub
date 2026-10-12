import { prisma } from "@repo/db";
import { createOrderInput, type OrderDto } from "@repo/types";
import { customerOrGuest } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";
import { createOrder } from "@/lib/orders";
import { orderDto, orderInclude } from "@/lib/serialize";
import { sweepExpired } from "@/lib/payments";

/** "Миний захиалгууд": orders placed from this session/account, newest first. */
export const GET = route(async (req) => {
  await sweepExpired();
  const user = await customerOrGuest(req);
  const rows = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: orderInclude });
  return ok<OrderDto[]>(rows.map(orderDto));
});

/** Checkout: creates a PENDING order from `items` or the session cart (then empties the cart). */
export const POST = route(async (req) => {
  const input = await body(req, createOrderInput);
  const user = await customerOrGuest(req);
  const order = await createOrder(user, input);
  return created<OrderDto>(orderDto(order));
});
