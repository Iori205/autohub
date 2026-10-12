import type { AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { findOrder } from "@/lib/orders";
import { adminOrderDto } from "@/lib/serialize";

export const GET = route<RouteContext<"/api/v1/admin/orders/[number]">>(async (req, { params }) => {
  await requireStaff(req);
  return ok<AdminOrderDto>(adminOrderDto(await findOrder((await params).number)));
});
