/* Dashboard (apps/dashboard) — filled in once the dashboard is wired to the API (next phase). */
import type { Ctx, Result } from "../lib/types";

export async function run(_ctx: Ctx): Promise<Result[]> {
  return [{ page: "Dashboard", action: "All pages", status: "todo", notes: "still on mock data — wired in the next phase" }];
}
