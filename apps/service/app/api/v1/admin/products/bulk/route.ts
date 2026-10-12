import { prisma } from "@repo/db";
import { productBulkInput } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";
import { moveStock } from "@/lib/orders";

/** Bulk actions from the Бараа list: activate / hide / delete / price / stock. */
export const POST = route(async (req) => {
  const staff = await requireStaff(req);
  const input = await body(req, productBulkInput);
  const where = { id: { in: input.ids } };
  const actor = { id: staff.id, name: staff.name ?? "Админ" };
  switch (input.action) {
    case "activate":
    case "hide":
      return ok({ updated: (await prisma.product.updateMany({ where, data: { active: input.action === "activate" } })).count });
    case "delete":
      return ok({ deleted: (await prisma.product.deleteMany({ where })).count });
    case "price": {
      const rows = await prisma.product.findMany({ where, select: { id: true, price: true } });
      await prisma.$transaction(
        rows.map((p) =>
          prisma.product.update({
            where: { id: p.id },
            data: {
              price:
                input.mode === "fixed"
                  ? Math.round(input.value)
                  : Math.max(500, Math.round((p.price * (1 + ((input.mode === "up" ? 1 : -1) * input.value) / 100)) / 500) * 500),
            },
          }),
        ),
      );
      return ok({ updated: rows.length });
    }
    case "stock": {
      const rows = await prisma.product.findMany({ where, select: { id: true, stock: true } });
      await prisma.$transaction(async (tx) => {
        for (const p of rows) {
          const delta = input.mode === "add" ? input.value : input.value - p.stock;
          if (delta) await moveStock(tx, p.id, delta, "Бөөнөөр засварласан", actor);
        }
      });
      return ok({ updated: rows.length });
    }
  }
});
