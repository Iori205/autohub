import { normalizeOem, prisma, type Prisma } from "@repo/db";
import { productPatch, type ProductDetailDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { badRequest, body, intParam, noContent, notFound, ok, route } from "@/lib/http";
import { moveStock } from "@/lib/orders";
import { productDetail, productDetailInclude } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/admin/products/[id]">;

export const GET = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const p = await prisma.product.findUnique({ where: { id: intParam((await params).id) }, include: productDetailInclude });
  if (!p) throw notFound("Бараа олдсонгүй");
  return ok<ProductDetailDto>(productDetail(p));
});

/** Partial update. `stock` is logged as a stock movement; `fitments` replaces the whole list. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const staff = await requireStaff(req);
  const id = intParam((await params).id);
  const { fitments, stock, specs, ...patch } = await body(req, productPatch);
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw notFound("Бараа олдсонгүй");
  const price = patch.price ?? before.price;
  const oldPrice = patch.oldPrice !== undefined ? patch.oldPrice : before.oldPrice;
  if (oldPrice != null && oldPrice <= price) throw badRequest("Хуучин үнэ одоогийн үнээс их байх ёстой", { oldPrice: "Хуучин үнэ одоогийн үнээс их байх ёстой" });

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...patch,
        ...(patch.oemNumbers ? { oemSearch: patch.oemNumbers.map(normalizeOem) } : {}),
        ...(specs ? { specs: specs as Prisma.InputJsonValue } : {}),
      },
    });
    if (fitments) {
      await tx.productFitment.deleteMany({ where: { productId: id } });
      await tx.productFitment.createMany({
        data: fitments.map((f) => ({ productId: id, vehicleId: f.vehicleId, yearFrom: f.yearFrom ?? null, yearTo: f.yearTo ?? null })),
        skipDuplicates: true,
      });
    }
    if (stock !== undefined && stock !== before.stock)
      await moveStock(tx, id, stock - before.stock, "Барааны карт засвар", { id: staff.id, name: staff.name ?? "Админ" });
    return tx.product.findUniqueOrThrow({ where: { id }, include: productDetailInclude });
  });
  return ok<ProductDetailDto>(productDetail(product));
});

/** Ordered products keep their order lines (productId becomes null). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  await prisma.product.delete({ where: { id: intParam((await params).id) } });
  return noContent();
});
