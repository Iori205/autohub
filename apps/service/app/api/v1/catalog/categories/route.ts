import { prisma } from "@repo/db";
import type { CategoryDto } from "@repo/types";
import { ok, route } from "@/lib/http";

export const GET = route(async () => {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  return ok<CategoryDto[]>(
    rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })),
  );
});
