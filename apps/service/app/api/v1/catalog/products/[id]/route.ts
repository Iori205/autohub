import { prisma } from "@repo/db";
import type { ProductDetailDto } from "@repo/types";
import { intParam, notFound, ok, route } from "@/lib/http";
import { productDetail, productDetailInclude } from "@/lib/serialize";

export const GET = route<RouteContext<"/api/v1/catalog/products/[id]">>(async (_req, { params }) => {
  const id = intParam((await params).id);
  const p = await prisma.product.findFirst({ where: { id, active: true }, include: productDetailInclude });
  if (!p) throw notFound("Бараа олдсонгүй");
  return ok<ProductDetailDto>(productDetail(p));
});
