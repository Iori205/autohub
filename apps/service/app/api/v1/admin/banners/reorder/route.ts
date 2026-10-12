import { prisma } from "@repo/db";
import { requireStaff } from "@/lib/auth";
import { body, noContent, route } from "@/lib/http";
import { z } from "zod";

/** { ids: [...] } in the new display order. */
export const POST = route(async (req) => {
  await requireStaff(req);
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).min(1).max(100) }));
  await prisma.$transaction(ids.map((id, i) => prisma.banner.update({ where: { id }, data: { sortOrder: i + 1 } })));
  return noContent();
});
