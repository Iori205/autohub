import { orderStatusInput, type AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";
import { findOrder, setStatus } from "@/lib/orders";
import { adminOrderDto } from "@/lib/serialize";

/** { status: "PAID" | "PREPARING" | "SHIPPING" | "DELIVERED" | "PENDING" | "EXPIRED" } — use /cancel to cancel. */
export const POST = route<RouteContext<"/api/v1/admin/orders/[number]/status">>(async (req, { params }) => {
  const staff = await requireStaff(req);
  const { status } = await body(req, orderStatusInput);
  const number = (await params).number;
  await setStatus(await findOrder(number), status, staff);
  return ok<AdminOrderDto>(adminOrderDto(await findOrder(number)));
});
