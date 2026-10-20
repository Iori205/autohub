import { prisma } from "@repo/db";
import { staffInviteInput, type StaffDto } from "@repo/types";
import { randomBytes } from "node:crypto";
import { hashPassword, requireStaff } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";
import { staffDto } from "@/lib/staff";

export const GET = route(async (req) => {
  await requireStaff(req);
  const rows = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "OPERATOR"] } }, orderBy: { createdAt: "asc" } });
  return ok<StaffDto[]>(rows.map(staffDto));
});

/**
 * Ажилтан урих (зөвхөн ADMIN). Урилгын и-мэйл хараахан холбогдоогүй тул
 * хариунд нэг удаагийн түр нууц үг ирнэ — түүнийг ажилтанд дамжуулна.
 */
export const POST = route(async (req) => {
  await requireStaff(req, "ADMIN");
  const input = await body(req, staffInviteInput);
  const tempPassword = randomBytes(6).toString("base64url");
  const u = await prisma.user.create({ data: { ...input, passwordHash: await hashPassword(tempPassword) } });
  return created<StaffDto & { tempPassword: string }>({ ...staffDto(u), tempPassword });
});
