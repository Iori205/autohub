import { prisma } from "@repo/db";
import { stockAdjustInput } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { badRequest, body, notFound, ok, route } from "@/lib/http";
import { moveStock } from "@/lib/orders";

/** "Нөөц тохируулах": { productId, delta: +48 | -2, reason }. Can't take more than is in stock. */
export const POST = route(async (req) => {
  const staff = await requireStaff(req);
  const { productId, delta, reason } = await body(req, stockAdjustInput);
  const stock = await prisma.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!p) throw notFound("Бараа олдсонгүй");
    if (p.stock + delta < 0) throw badRequest(`Нөөцөөс их байна (${p.stock} ш)`, { delta: `Нөөцөөс их байна (${p.stock} ш)` });
    await moveStock(tx, productId, delta, reason, { id: staff.id, name: staff.name ?? "Админ" });
    return (await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { stock: true } })).stock;
  });
  return ok({ productId, stock });
});
