import type { CustomerSessionDto } from "@repo/types";
import { currentCustomer } from "@/lib/auth";
import { ok, route } from "@/lib/http";

/** Current customer session, or null (never creates a guest). */
export const GET = route(async (req) => {
  const u = await currentCustomer(req);
  return ok<CustomerSessionDto | null>(u && { id: u.id, isGuest: u.isGuest, name: u.name, phone: u.phone, email: u.email });
});
