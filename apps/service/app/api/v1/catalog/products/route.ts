import { prisma } from "@repo/db";
import { productQuery, type Page, type ProductSummaryDto } from "@repo/types";
import { productOrder, productWhere } from "@/lib/catalog";
import { ok, query, route } from "@/lib/http";
import { productSummary, productSummaryInclude } from "@/lib/serialize";

/**
 * GET /api/v1/catalog/products
 * ?q=тоормос | ?q=04465-47070 (нэр эсвэл OEM, зай/зураас үл тооно) &category=brake,filter &brand=Bosch
 * &type=orig|analog &inStock=1 &sale=1 &priceMin= &priceMax= &make=…&model=…&year=…&engine=… | &vehicleId=
 * &sort=rec|asc|desc|stock &page=1&pageSize=24
 */
export const GET = route(async (req) => {
  const q = query(req, productQuery);
  const where = await productWhere(q, true);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: productOrder(q.sort),
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: productSummaryInclude,
    }),
  ]);
  return ok<Page<ProductSummaryDto>>({ items: rows.map(productSummary), total, page: q.page, pageSize: q.pageSize });
});
