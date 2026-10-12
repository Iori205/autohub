import { prisma } from "@repo/db";
import { vehicleQuery } from "@repo/types";
import { ok, query, route } from "@/lib/http";

/**
 * Vehicle finder cascade (Үйлдвэрлэгч → Загвар → Он → Хөдөлгүүр):
 *   no params        → { makes }
 *   make             → { models }
 *   make+model       → { years }   newest first
 *   make+model+year  → { engines }
 */
export const GET = route(async (req) => {
  const q = query(req, vehicleQuery);
  if (!q.make) {
    const rows = await prisma.vehicle.findMany({ distinct: ["make"], select: { make: true }, orderBy: { make: "asc" } });
    return ok({ makes: rows.map((r) => r.make) });
  }
  if (!q.model) {
    const rows = await prisma.vehicle.findMany({ where: { make: q.make }, distinct: ["model"], select: { model: true }, orderBy: { model: "asc" } });
    return ok({ models: rows.map((r) => r.model) });
  }
  const variants = await prisma.vehicle.findMany({ where: { make: q.make, model: q.model } });
  if (!q.year) {
    if (!variants.length) return ok({ years: [] });
    const hi = Math.max(...variants.map((v) => v.yearTo));
    const lo = Math.min(...variants.map((v) => v.yearFrom));
    return ok({ years: Array.from({ length: hi - lo + 1 }, (_, i) => hi - i) });
  }
  const engines = variants.filter((v) => v.yearFrom <= q.year! && v.yearTo >= q.year!).map((v) => ({ id: v.id, engine: v.engine }));
  return ok({ engines });
});
