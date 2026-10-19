import { prisma } from "@repo/db";
import type { AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { notFound, ok, route } from "@/lib/http";
import { findOrder } from "@/lib/orders";
import { checkPayment } from "@/lib/payments";
import { adminOrderDto } from "@/lib/serialize";

/** "QPay төлөв шалгах" on the order page: asks QPay (or the demo state) and returns the fresh order. */
export const POST = route<RouteContext<"/api/v1/admin/orders/[number]/check">>(async (req, { params }) => {
  await requireStaff(req);
  const number = (await params).number.toUpperCase();
  const o = await prisma.order.findUnique({ where: { number } });
  if (!o) throw notFound("Захиалга олдсонгүй");
  if (o.paymentStatus === "PENDING") await checkPayment(o);
  return ok<AdminOrderDto>(adminOrderDto(await findOrder(number)));
});
