import { prisma } from "@repo/db";
import { customerQuery, type CustomerDto, type Page } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, query, route } from "@/lib/http";
import { customerDtos } from "@/lib/customers";

/** Хэрэглэгчид (registered customers and guests who ordered), biggest spenders first. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, customerQuery);
  const digits = q.q?.replace(/[\s-]/g, "") ?? "";
  const where = {
    role: "CUSTOMER" as const,
    OR: [{ isGuest: false }, { orders: { some: {} } }],
    ...(q.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q.q, mode: "insensitive" as const } },
                { email: { contains: q.q, mode: "insensitive" as const } },
                ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
              ],
            },
          ],
        }
      : {}),
  };
  const users = await prisma.user.findMany({ where, include: { cars: true } });
  const all = (await customerDtos(users)).sort((a, b) => b.spent - a.spent);
  return ok<Page<CustomerDto>>({ items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: all.length, page: q.page, pageSize: q.pageSize });
});
