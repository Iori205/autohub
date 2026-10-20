import { prisma, type SavedCar, type User } from "@repo/db";
import type { CustomerDto } from "@repo/types";

/** Хэрэглэгчийн мөр: захиалгын тоо, зарцуулсан мөнгө (төлөгдсөн захиалга), сүүлийн захиалгын огноо. */
export async function customerDtos(users: (User & { cars: SavedCar[] })[]): Promise<CustomerDto[]> {
  const ids = users.map((u) => u.id);
  const [counts, spent] = await Promise.all([
    prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true, _max: { createdAt: true } }),
    prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, paymentStatus: "PAID" }, _sum: { total: true } }),
  ]);
  const c = new Map(counts.map((r) => [r.userId, r]));
  const s = new Map(spent.map((r) => [r.userId, r._sum.total ?? 0]));
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    address: u.address,
    isGuest: u.isGuest,
    createdAt: u.createdAt.toISOString(),
    cars: u.cars.map((x) => ({ make: x.make, model: x.model, year: x.year, engine: x.engine })),
    orderCount: c.get(u.id)?._count ?? 0,
    spent: s.get(u.id) ?? 0,
    lastOrderAt: c.get(u.id)?._max.createdAt?.toISOString() ?? null,
  }));
}
