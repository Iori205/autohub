import { prisma, type Fuel } from "@repo/db";
import { vehicleImportInput } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";

const FUEL: Record<string, Fuel> = {
  бензин: "PETROL", petrol: "PETROL", gasoline: "PETROL",
  дизель: "DIESEL", diesel: "DIESEL",
  хайбрид: "HYBRID", hybrid: "HYBRID",
  цахилгаан: "ELECTRIC", electric: "ELECTRIC",
};

/** CSV: make,model,gen,year_from,year_to,engine,fuel (header optional). Existing make+model+engine rows are skipped. */
export const POST = route(async (req) => {
  await requireStaff(req);
  const { csv } = await body(req, vehicleImportInput);
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().startsWith("make")) lines.shift();
  const errors: { line: number; message: string }[] = [];
  const rows = [];
  for (const [i, line] of lines.entries()) {
    const [make, model, gen, y1, y2, engine, fuel] = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const yearFrom = Number(y1);
    const yearTo = Number(y2);
    if (!make || !model || !engine) errors.push({ line: i + 1, message: "make, model, engine шаардлагатай" });
    else if (!(yearFrom >= 1980) || !(yearTo >= yearFrom)) errors.push({ line: i + 1, message: "Он буруу" });
    else rows.push({ make, model, generation: gen ?? "", yearFrom, yearTo, engine, fuel: FUEL[(fuel ?? "").toLowerCase()] ?? "PETROL" });
  }
  const res = await prisma.vehicle.createMany({ data: rows, skipDuplicates: true });
  return ok({ added: res.count, skipped: rows.length - res.count, errors });
});
