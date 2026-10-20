import { prisma } from "@repo/db";
import { vehicleInput, vehicleQuery, type VehicleDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, ok, query, route } from "@/lib/http";
import { vehicleDto } from "@/lib/serialize";

/** Машины сан, мөр бүрт холбогдсон барааны тоотой. */
export const GET = route(async (req) => {
  await requireStaff(req);
  const q = query(req, vehicleQuery);
  const rows = await prisma.vehicle.findMany({
    where: { make: q.make, model: q.model },
    orderBy: [{ make: "asc" }, { model: "asc" }, { engine: "asc" }],
    include: { _count: { select: { fitments: true } } },
  });
  return ok<(VehicleDto & { productCount: number })[]>(rows.map((v) => ({ ...vehicleDto(v), productCount: v._count.fitments })));
});

export const POST = route(async (req) => {
  await requireStaff(req);
  const v = await prisma.vehicle.create({ data: await body(req, vehicleInput) });
  return created<VehicleDto>(vehicleDto(v));
});
