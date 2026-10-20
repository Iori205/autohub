import { prisma } from "@repo/db";
import { categoryInput, type CategoryDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, conflict, noContent, ok, route } from "@/lib/http";

type Ctx = RouteContext<"/api/v1/admin/categories/[id]">;

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const input = await body(req, categoryInput.partial());
  const c = await prisma.category.update({ where: { id: (await params).id }, data: input, include: { _count: { select: { products: true } } } });
  const { _count, ...rest } = c;
  return ok<CategoryDto>({ ...rest, productCount: _count.products });
});

/** Зөвхөн хоосон ангиллыг устгана. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const id = (await params).id;
  const n = await prisma.product.count({ where: { categoryId: id } });
  if (n) throw conflict(`Энэ ангилалд ${n} бараа байгаа тул устгах боломжгүй`);
  await prisma.category.delete({ where: { id } });
  return noContent();
});
