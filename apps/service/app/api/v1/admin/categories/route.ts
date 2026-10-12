import { prisma } from "@repo/db";
import { categoryInput, type CategoryDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";

export const GET = route(async (req) => {
  await requireStaff(req);
  const rows = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return ok<CategoryDto[]>(rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
});

export const POST = route(async (req) => {
  await requireStaff(req);
  const input = await body(req, categoryInput);
  const sortOrder = input.sortOrder ?? (await prisma.category.count());
  const c = await prisma.category.create({ data: { ...input, sortOrder, countLabel: input.countLabel ?? null } });
  return created<CategoryDto>({ ...c, productCount: 0 });
});
