import { normalizeOem, prisma, Prisma } from "@repo/db";
import type { ProductQuery } from "@repo/types";

/** Дэлгүүр (/catalog/products) ба самбарын (/admin/products) нийтлэг барааны шүүлтүүр. `publicOnly` идэвхгүй барааг нууна. */
export async function productWhere(
  q: ProductQuery & { stockLevel?: "ok" | "low" | "out"; active?: boolean },
  publicOnly: boolean,
): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [];
  if (publicOnly) and.push({ active: true });
  else if (q.active !== undefined) and.push({ active: q.active });

  if (q.q) {
    // Нэрээр, эсвэл зай/зураасыг үл тоон хайлтыг агуулсан OEM дугаараар таарна.
    const oem = normalizeOem(q.q);
    const oemIds = oem.length >= 3
      ? await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "Product"
          WHERE EXISTS (SELECT 1 FROM unnest("oemSearch") o WHERE o LIKE ${"%" + oem + "%"})`
      : [];
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { brand: { name: { contains: q.q, mode: "insensitive" } } },
        { id: { in: oemIds.map((r) => r.id) } },
      ],
    });
  }
  if (q.category?.length) and.push({ category: { slug: { in: q.category } } });
  if (q.brand?.length) and.push({ brand: { name: { in: q.brand } } });
  if (q.type === "orig") and.push({ type: "ORIGINAL" });
  if (q.type === "analog") and.push({ type: "AFTERMARKET" });
  if (q.inStock) and.push({ stock: { gt: 0 } });
  if (q.sale) and.push({ oldPrice: { not: null } });
  if (q.priceMin !== undefined) and.push({ price: { gte: q.priceMin } });
  if (q.priceMax !== undefined) and.push({ price: { lte: q.priceMax } });

  // Тохирол: тодорхой машины мөр, эсвэл make/model(/engine) ба сонголтоор он.
  if (q.vehicleId || q.make || q.model) {
    const vehicle: Prisma.VehicleWhereInput = q.vehicleId
      ? { id: q.vehicleId }
      : { make: q.make, model: q.model, ...(q.engine ? { engine: q.engine } : {}) };
    const year = q.year;
    and.push({
      fitments: {
        some: {
          vehicle: year ? { ...vehicle, yearFrom: { lte: year }, yearTo: { gte: year } } : vehicle,
          ...(year
            ? {
                AND: [
                  { OR: [{ yearFrom: null }, { yearFrom: { lte: year } }] },
                  { OR: [{ yearTo: null }, { yearTo: { gte: year } }] },
                ],
              }
            : {}),
        },
      },
    });
  }

  if (q.stockLevel === "out") and.push({ stock: 0 });
  if (q.stockLevel === "low" || q.stockLevel === "ok") {
    // нөөцийг бараа бүрийн өөрийн босготой харьцуулна
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Product"
      WHERE ${q.stockLevel === "low" ? Prisma.sql`stock > 0 AND stock <= "lowStockThreshold"` : Prisma.sql`stock > "lowStockThreshold"`}`;
    and.push({ id: { in: rows.map((r) => r.id) } });
  }
  return { AND: and };
}

export function productOrder(sort: ProductQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "asc") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "desc") return [{ price: "desc" }, { id: "asc" }];
  if (sort === "stock") return [{ stock: "desc" }, { id: "asc" }];
  return [{ sortOrder: "asc" }, { id: "asc" }];
}
