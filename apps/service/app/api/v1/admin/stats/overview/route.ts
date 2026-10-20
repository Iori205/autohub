import { overviewQuery } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";
import { overview } from "@/lib/stats";
import { sweepExpired } from "@/lib/payments";

/** Хянах самбар: KPI, орлогын цуваа (?days=7|30|90), төлөвийн дугуй график, шилдэг жагсаалт. */
export const GET = route(async (req) => {
  await sweepExpired();
  await requireStaff(req);
  const q = query(req, overviewQuery);
  return ok(await overview(q.days, q.today));
});
