import { prisma } from "@repo/db";
import type { CustomerDto, OrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { customerDtos } from "@/lib/customers";
import { notFound, ok, route } from "@/lib/http";
import { orderDto, orderInclude } from "@/lib/serialize";

/** Хэрэглэгчийн дэлгэрэнгүй: профайл, хадгалсан машин, статистик, бүх захиалга. */
export const GET = route<RouteContext<"/api/v1/admin/customers/[id]">>(async (req, { params }) => {
  await requireStaff(req);
  const u = await prisma.user.findFirst({ where: { id: (await params).id, role: "CUSTOMER" }, include: { cars: true } });
  if (!u) throw notFound("Хэрэглэгч олдсонгүй");
  const [dto] = await customerDtos([u]);
  const orders = await prisma.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, include: orderInclude });
  return ok<CustomerDto & { orders: OrderDto[] }>({ ...dto!, orders: orders.map(orderDto) });
});
