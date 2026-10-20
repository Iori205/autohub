import { prisma } from "@repo/db";
import { brandInput, type BrandDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, conflict, noContent, ok, route } from "@/lib/http";

type Ctx = RouteContext<"/api/v1/admin/brands/[id]">;

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const { _count, ...b } = await prisma.brand.update({
    where: { id: (await params).id },
    data: await body(req, brandInput.partial()),
    include: { _count: { select: { products: true } } },
  });
  return ok<BrandDto>({ ...b, productCount: _count.products });
});

/** Бараа заавал брэндтэй тул ашиглагдаж буй брэндийг устгахгүй. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const id = (await params).id;
  const n = await prisma.product.count({ where: { brandId: id } });
  if (n) throw conflict(`${n} бараа энэ брэндтэй холбоотой тул устгах боломжгүй`);
  await prisma.brand.delete({ where: { id } });
  return noContent();
});
