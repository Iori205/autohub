import { prisma, type Prisma } from "@repo/db";
import { adminOrderQuery, type AdminOrderDto, type OrderStage, type Page } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";
import { adminOrderDto, adminOrderInclude } from "@/lib/serialize";
import { ubEnd, ubStart } from "@/lib/time";

const STAGE: Record<Exclude<OrderStage, never>, Prisma.OrderWhereInput> = {
  pending: { paymentStatus: "PENDING" },
  paid: { paymentStatus: "PAID", deliveryStatus: "NONE" },
  preparing: { paymentStatus: "PAID", deliveryStatus: "PREPARING" },
  shipping: { paymentStatus: "PAID", deliveryStatus: "SHIPPING" },
  delivered: { paymentStatus: "PAID", deliveryStatus: "DELIVERED" },
  cancelled: { paymentStatus: "CANCELLED" },
  expired: { paymentStatus: "EXPIRED" },
};

/** Захиалгууд list. Also returns per-stage counts for the tabs (ignoring the stage filter). */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, adminOrderQuery);
  const base: Prisma.OrderWhereInput[] = [];
  if (q.q) {
    const digits = q.q.replace(/[\s#-]/g, "");
    base.push({
      OR: [
        { number: { contains: digits, mode: "insensitive" } },
        { customerName: { contains: q.q, mode: "insensitive" } },
        ...(digits.length >= 3 && /^\d+$/.test(digits) ? [{ customerPhone: { contains: digits } }] : []),
      ],
    });
  }
  if (q.payment) base.push({ paymentStatus: q.payment });
  if (q.refunded !== undefined) base.push(q.refunded ? { paidAt: { not: null } } : { paidAt: null });
  if (q.delivery) base.push({ deliveryMethod: q.delivery });
  if (q.from) base.push({ createdAt: { gte: ubStart(q.from) } });
  if (q.to) base.push({ createdAt: { lt: ubEnd(q.to) } });
  if (q.customerId) base.push({ userId: q.customerId });

  const where: Prisma.OrderWhereInput = { AND: [...base, ...(q.stage === "all" ? [] : [STAGE[q.stage]])] };
  const [total, rows, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: adminOrderInclude,
    }),
    Promise.all(
      (Object.keys(STAGE) as OrderStage[]).map(async (s) => [s, await prisma.order.count({ where: { AND: [...base, STAGE[s]] } })] as const),
    ),
  ]);
  const stageCounts = Object.fromEntries(counts) as Record<OrderStage, number>;
  return ok<Page<AdminOrderDto> & { stageCounts: Record<OrderStage, number>; all: number }>({
    items: rows.map(adminOrderDto),
    total,
    page: q.page,
    pageSize: q.pageSize,
    stageCounts,
    all: Object.values(stageCounts).reduce((a, b) => a + b, 0),
  });
});
