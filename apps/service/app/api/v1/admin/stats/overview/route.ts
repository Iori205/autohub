import { overviewQuery } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";
import { overview } from "@/lib/stats";

/** Хянах самбар: KPIs, revenue series (?days=7|30|90), status donut, top lists. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, overviewQuery);
  return ok(await overview(q.days, q.today));
});
