import { orderBulkStatusInput } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ApiError, body, ok, route } from "@/lib/http";
import { findOrder, setStatus } from "@/lib/orders";

/** Apply one status to many orders; returns which ones failed and why. */
export const POST = route(async (req) => {
  const staff = await requireStaff(req);
  const { numbers, status } = await body(req, orderBulkStatusInput);
  const failed: Record<string, string> = {};
  for (const n of numbers) {
    try {
      await setStatus(await findOrder(n), status, staff);
    } catch (e) {
      failed[n] = e instanceof ApiError ? e.message : "Алдаа гарлаа";
    }
  }
  return ok({ updated: numbers.length - Object.keys(failed).length, failed });
});
