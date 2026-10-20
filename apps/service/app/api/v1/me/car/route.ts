import { prisma } from "@repo/db";
import { savedCarInput, type SavedCarDto } from "@repo/types";
import { currentCustomer, customerOrGuest } from "@/lib/auth";
import { body, noContent, ok, route } from "@/lib/http";

/** Машин сонгогчоор сонгосон машин («Миний машин»), хэрэглэгчийн сесс бүрт хадгална. */
export const GET = route(async (req) => {
  const user = await currentCustomer(req);
  const car = user ? await prisma.savedCar.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : null;
  return ok<SavedCarDto | null>(car && { make: car.make, model: car.model, year: car.year, engine: car.engine });
});

/** Машин сонгох: хэрэглэгчийн хамгийн сүүлд хадгалсан машин болно (бусад нь хадгалагдсаар). */
export const PUT = route(async (req) => {
  const input = await body(req, savedCarInput);
  const user = await customerOrGuest(req);
  const vehicle = await prisma.vehicle.findFirst({
    where: { make: input.make, model: input.model, ...(input.engine ? { engine: input.engine } : {}) },
    select: { id: true },
  });
  const car = await prisma.$transaction(async (tx) => {
    await tx.savedCar.deleteMany({ where: { userId: user.id, make: input.make, model: input.model, year: input.year, engine: input.engine } });
    return tx.savedCar.create({ data: { ...input, userId: user.id, vehicleId: vehicle?.id ?? null } });
  });
  return ok<SavedCarDto>({ make: car.make, model: car.model, year: car.year, engine: car.engine });
});

/** «Машин арилгах»: сонгосон (сүүлийн) машиныг устгана. */
export const DELETE = route(async (req) => {
  const user = await currentCustomer(req);
  const car = user ? await prisma.savedCar.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : null;
  if (car) await prisma.savedCar.delete({ where: { id: car.id } });
  return noContent();
});
