import { reportQuery } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";
import { report } from "@/lib/stats";

/** Тайлан: ?period=day|week|month */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, reportQuery);
  return ok(await report(q.period, q.today));
});
