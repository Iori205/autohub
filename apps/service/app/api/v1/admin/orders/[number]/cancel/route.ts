import { orderCancelInput, type AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";
import { cancelOrder, findOrder } from "@/lib/orders";
import { retireInvoice } from "@/lib/payments";
import { adminOrderDto } from "@/lib/serialize";

/** Шалтгаантай цуцлах; төлөгдсөн захиалгыг буцаалттай гэж тэмдэглэж нөөцийг нь буцаана. */
export const POST = route<RouteContext<"/api/v1/admin/orders/[number]/cancel">>(async (req, { params }) => {
  const staff = await requireStaff(req);
  const { reason, comment } = await body(req, orderCancelInput);
  const number = (await params).number;
  const order = await findOrder(number);
  await cancelOrder(order, reason, comment, staff);
  if (order.qpayInvoiceId) await retireInvoice(order.qpayInvoiceId, "CANCELLED");
  return ok<AdminOrderDto>(adminOrderDto(await findOrder(number)));
});
