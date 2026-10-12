import { prisma } from "@repo/db";
import type { BrandDto } from "@repo/types";
import { ok, route } from "@/lib/http";

export const GET = route(async () => {
  const rows = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  return ok<BrandDto[]>(rows.map(({ _count, ...b }) => ({ ...b, productCount: _count.products })));
});
