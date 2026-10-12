import { prisma } from "@repo/db";
import { vehicleQuery, type VehicleDto } from "@repo/types";
import { ok, query, route } from "@/lib/http";
import { vehicleDto } from "@/lib/serialize";

/** Vehicle variants (one row per engine). Filter by make/model and a year in range. */
export const GET = route(async (req) => {
  const q = query(req, vehicleQuery);
  const rows = await prisma.vehicle.findMany({
    where: {
      make: q.make,
      model: q.model,
      ...(q.year ? { yearFrom: { lte: q.year }, yearTo: { gte: q.year } } : {}),
    },
    orderBy: [{ make: "asc" }, { model: "asc" }, { engine: "asc" }],
  });
  return ok<VehicleDto[]>(rows.map(vehicleDto));
});
