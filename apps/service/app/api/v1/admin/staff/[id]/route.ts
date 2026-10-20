import { prisma } from "@repo/db";
import { staffRoleInput, type StaffDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, conflict, noContent, notFound, ok, route } from "@/lib/http";
import { staffDto } from "@/lib/staff";

type Ctx = RouteContext<"/api/v1/admin/staff/[id]">;

export const PATCH = route<Ctx>(async (req, { params }) => {
  const me = await requireStaff(req, "ADMIN");
  const id = (await params).id;
  if (id === me.id) throw conflict("Өөрийн эрхийг өөрчлөх боломжгүй");
  const { role } = await body(req, staffRoleInput);
  const u = await prisma.user.findFirst({ where: { id, role: { in: ["ADMIN", "OPERATOR"] } } });
  if (!u) throw notFound("Хэрэглэгч олдсонгүй");
  return ok<StaffDto>(staffDto(await prisma.user.update({ where: { id }, data: { role } })));
});

/** Админ эрхийг хасна (бүртгэлээр самбарт нэвтрэх боломжгүй болно). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const me = await requireStaff(req, "ADMIN");
  const id = (await params).id;
  if (id === me.id) throw conflict("Өөрийгөө хасах боломжгүй");
  const u = await prisma.user.findFirst({ where: { id, role: { in: ["ADMIN", "OPERATOR"] } } });
  if (!u) throw notFound("Хэрэглэгч олдсонгүй");
  await prisma.user.delete({ where: { id } });
  return noContent();
});
