import { prisma } from "@repo/db";
import { productQuery, type ProductSummaryDto } from "@repo/types";
import { productOrder, productWhere } from "@/lib/catalog";
import { badRequest, ok, query, route } from "@/lib/http";
import { productSummary, productSummaryInclude } from "@/lib/serialize";

/**
 * Машинд тохирох сэлбэг: ?vehicleId= эсвэл ?make=&model=(&year=&engine=).
 * /catalog/products-тэй ижил шүүлтүүр, хуудаслалтгүй.
 */
export const GET = route(async (req) => {
  const q = query(req, productQuery);
  if (!q.vehicleId && !(q.make && q.model)) throw badRequest("vehicleId эсвэл make + model шаардлагатай");
  const rows = await prisma.product.findMany({
    where: await productWhere(q, true),
    orderBy: productOrder(q.sort),
    include: productSummaryInclude,
  });
  return ok<ProductSummaryDto[]>(rows.map(productSummary));
});
