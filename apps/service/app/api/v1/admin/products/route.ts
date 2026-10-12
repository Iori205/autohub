import { normalizeOem, prisma, type Prisma } from "@repo/db";
import { adminProductQuery, productInput, type Page, type ProductDetailDto, type ProductSummaryDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { productOrder, productWhere } from "@/lib/catalog";
import { body, created, ok, query, route } from "@/lib/http";
import { moveStock } from "@/lib/orders";
import { productDetail, productDetailInclude, productSummary, productSummaryInclude } from "@/lib/serialize";

/** Бараа list incl. hidden products; ?stockLevel=ok|low|out &active=0|1 plus the catalog filters. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, adminProductQuery);
  const where = await productWhere(q, false);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: productOrder(q.sort), skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: productSummaryInclude }),
  ]);
  return ok<Page<ProductSummaryDto>>({ items: rows.map(productSummary), total, page: q.page, pageSize: q.pageSize });
});

export const POST = route(async (req) => {
  const staff = await requireStaff(req);
  const { fitments, stock, sortOrder, ...p } = await body(req, productInput);
  const product = await prisma.$transaction(async (tx) => {
    const last = await tx.product.aggregate({ _max: { sortOrder: true } });
    const row = await tx.product.create({
      data: {
        ...p,
        sortOrder: sortOrder ?? (last._max.sortOrder ?? 0) + 1,
        stock: 0,
        oemSearch: p.oemNumbers.map(normalizeOem),
        specs: p.specs as Prisma.InputJsonValue,
        fitments: { create: fitments.map((f) => ({ vehicleId: f.vehicleId, yearFrom: f.yearFrom ?? null, yearTo: f.yearTo ?? null })) },
      },
    });
    if (stock) await moveStock(tx, row.id, stock, "Шинэ бараа", { id: staff.id, name: staff.name ?? "Админ" });
    return tx.product.findUniqueOrThrow({ where: { id: row.id }, include: productDetailInclude });
  });
  return created<ProductDetailDto>(productDetail(product));
});
