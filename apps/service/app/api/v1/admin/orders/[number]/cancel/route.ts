import { orderCancelInput, type AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";
import { cancelOrder, findOrder } from "@/lib/orders";
import { adminOrderDto } from "@/lib/serialize";

/** Cancel with a reason; a paid order is marked refunded and its stock is returned. */
export const POST = route<RouteContext<"/api/v1/admin/orders/[number]/cancel">>(async (req, { params }) => {
  const staff = await requireStaff(req);
  const { reason, comment } = await body(req, orderCancelInput);
  const number = (await params).number;
  await cancelOrder(await findOrder(number), reason, comment, staff);
  return ok<AdminOrderDto>(adminOrderDto(await findOrder(number)));
});
