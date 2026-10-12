import { prisma } from "@repo/db";
import { vehicleFields, type VehicleDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { badRequest, body, noContent, ok, route } from "@/lib/http";
import { vehicleDto } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/admin/vehicles/[id]">;

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const id = (await params).id;
  const before = await prisma.vehicle.findUniqueOrThrow({ where: { id } });
  const v = { ...before, ...(await body(req, vehicleFields.partial())) };
  if (v.yearTo < v.yearFrom) throw badRequest("Дуусах он эхлэх оноос хойш байх ёстой", { yearTo: "Дуусах он эхлэх оноос хойш байх ёстой" });
  const row = await prisma.vehicle.update({
    where: { id },
    data: { make: v.make, model: v.model, generation: v.generation, yearFrom: v.yearFrom, yearTo: v.yearTo, engine: v.engine, fuel: v.fuel },
  });
  return ok<VehicleDto>(vehicleDto(row));
});

/** Removes the vehicle and its product fitments. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  await prisma.vehicle.delete({ where: { id: (await params).id } });
  return noContent();
});
