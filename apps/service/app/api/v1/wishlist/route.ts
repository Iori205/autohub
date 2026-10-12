import { prisma } from "@repo/db";
import type { ProductSummaryDto } from "@repo/types";
import { customerOrGuest } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { productSummary, productSummaryInclude } from "@/lib/serialize";

export const GET = route(async (req) => {
  const user = await customerOrGuest(req);
  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { active: true } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productSummaryInclude } },
  });
  return ok<ProductSummaryDto[]>(rows.map((r) => productSummary(r.product)));
});
