import { prisma } from "@repo/db";
import { ok, route } from "@/lib/http";

/** Liveness + database check. */
export const GET = route(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ ok: true, time: new Date().toISOString() });
});
