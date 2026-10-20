import { prisma } from "@repo/db";
import { loginInput, type CustomerSessionDto } from "@repo/types";
import { checkPassword, currentCustomer, startCustomerSession, throttle } from "@/lib/auth";
import { adoptGuest } from "@/lib/cart";
import { ApiError, body, ok, route } from "@/lib/http";

/** Утас эсвэл и-мэйлээр нэвтрэх. Зочны сагс, хүслийн жагсаалт, захиалга бүртгэл рүү шилжинэ. */
export const POST = route(async (req) => {
  const { login, password } = await body(req, loginInput);
  const t = await throttle(req, `customer:${login}`);
  const key = login.includes("@") ? { email: login.toLowerCase() } : { phone: login.replace(/[\s-]/g, "") };
  const user = await prisma.user.findFirst({ where: { ...key, role: "CUSTOMER", isGuest: false } });
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    await t.fail();
    throw new ApiError("UNAUTHORIZED", "Утас/и-мэйл эсвэл нууц үг буруу байна");
  }
  await t.reset();
  const guest = await currentCustomer(req);
  if (guest?.isGuest) await adoptGuest(guest.id, user.id);
  await startCustomerSession(user);
  return ok<CustomerSessionDto>({ id: user.id, isGuest: false, name: user.name, phone: user.phone, email: user.email });
});
