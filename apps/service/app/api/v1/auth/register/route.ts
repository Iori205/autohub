import { prisma } from "@repo/db";
import { registerInput, type CustomerSessionDto } from "@repo/types";
import { currentCustomer, hashPassword, startCustomerSession } from "@/lib/auth";
import { ApiError, body, created, route } from "@/lib/http";

/**
 * Create a customer account. A guest session is upgraded in place, so its
 * cart, wishlist and orders stay with the new account.
 */
export const POST = route(async (req) => {
  const input = await body(req, registerInput);
  const taken = await prisma.user.findFirst({
    where: { OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])] },
    select: { phone: true },
  });
  if (taken)
    throw new ApiError("CONFLICT", "Энэ утас эсвэл и-мэйлээр бүртгэл үүссэн байна", {
      [taken.phone === input.phone ? "phone" : "email"]: "Бүртгэлтэй байна",
    });
  const data = { name: input.name, phone: input.phone, email: input.email ?? null, passwordHash: await hashPassword(input.password), isGuest: false };
  const guest = await currentCustomer(req);
  const user = guest?.isGuest
    ? await prisma.user.update({ where: { id: guest.id }, data })
    : await prisma.user.create({ data: { ...data, role: "CUSTOMER" } });
  await startCustomerSession(user);
  return created<CustomerSessionDto>({ id: user.id, isGuest: false, name: user.name, phone: user.phone, email: user.email });
});
