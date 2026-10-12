import { prisma } from "@repo/db";
import { stockQuery, type Page, type StockMovementDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";

/** Нөөцийн хөдөлгөөний түүх, newest first. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, stockQuery);
  const where = q.productId ? { productId: q.productId } : {};
  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { product: { select: { name: true } }, order: { select: { number: true } } },
    }),
  ]);
  return ok<Page<StockMovementDto>>({
    items: rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      delta: m.delta,
      reason: m.reason,
      orderNumber: m.order?.number ?? null,
      actorName: m.actorName,
      stockAfter: m.stockAfter,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  });
});
