import { prisma } from "@repo/db";
import { orderLookupInput, type OrderDto } from "@repo/types";
import { throttle } from "@/lib/auth";
import { body, notFound, ok, route } from "@/lib/http";
import { orderDto, orderInclude } from "@/lib/serialize";

/** Guest lookup: the phone number given at checkout + the order number. */
export const POST = route(async (req) => {
  const { phone, number } = await body(req, orderLookupInput);
  const t = throttle(req, `lookup:${phone}`);
  const o = await prisma.order.findFirst({ where: { number, customerPhone: phone }, include: orderInclude });
  if (!o) {
    t.fail();
    throw notFound("Ийм утас, дугаартай захиалга олдсонгүй");
  }
  t.reset();
  return ok<OrderDto>(orderDto(o));
});
