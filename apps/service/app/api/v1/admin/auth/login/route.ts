import { prisma } from "@repo/db";
import { adminLoginInput, type StaffDto } from "@repo/types";
import { checkPassword, startStaffSession, throttle } from "@/lib/auth";
import { ApiError, body, ok, route } from "@/lib/http";
import { staffDto } from "@/lib/staff";

export const POST = route(async (req) => {
  const { email, password, remember } = await body(req, adminLoginInput);
  const t = throttle(req, `staff:${email}`);
  const user = await prisma.user.findFirst({ where: { email, role: { in: ["ADMIN", "OPERATOR"] } } });
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    t.fail();
    throw new ApiError("UNAUTHORIZED", "И-мэйл эсвэл нууц үг буруу байна");
  }
  t.reset();
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await startStaffSession(user, remember ?? false);
  return ok<StaffDto>(staffDto(user));
});
