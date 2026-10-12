import { prisma } from "@repo/db";
import { brandInput, type BrandDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";

export const GET = route(async (req) => {
  await requireStaff(req);
  const rows = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  return ok<BrandDto[]>(rows.map(({ _count, ...b }) => ({ ...b, productCount: _count.products })));
});

export const POST = route(async (req) => {
  await requireStaff(req);
  const b = await prisma.brand.create({ data: await body(req, brandInput) });
  return created<BrandDto>({ ...b, productCount: 0 });
});
