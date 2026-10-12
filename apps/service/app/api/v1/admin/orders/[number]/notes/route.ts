import { orderNoteInput, type AdminOrderDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, route } from "@/lib/http";
import { addNote, findOrder } from "@/lib/orders";
import { adminOrderDto } from "@/lib/serialize";

export const POST = route<RouteContext<"/api/v1/admin/orders/[number]/notes">>(async (req, { params }) => {
  const staff = await requireStaff(req);
  const { text } = await body(req, orderNoteInput);
  const number = (await params).number;
  await addNote(await findOrder(number), text, staff);
  return created<AdminOrderDto>(adminOrderDto(await findOrder(number)));
});
