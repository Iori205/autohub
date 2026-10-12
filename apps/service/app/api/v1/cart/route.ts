import { prisma } from "@repo/db";
import { cartReplaceInput } from "@repo/types";
import { customerOrGuest } from "@/lib/auth";
import { cartDto, ensureCart } from "@/lib/cart";
import { body, ok, route } from "@/lib/http";

/** The session cart (a guest session is created on first use). */
export const GET = route(async (req) => {
  const user = await customerOrGuest(req);
  return ok(await cartDto(user.id));
});

/** Replace the whole cart, e.g. to import a cart kept in the browser. */
export const PUT = route(async (req) => {
  const { items } = await body(req, cartReplaceInput);
  const user = await customerOrGuest(req);
  const cart = await ensureCart(user.id);
  const valid = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, active: true }, select: { id: true } });
  const ok_ = new Set(valid.map((p) => p.id));
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cartItem.createMany({
      data: items.filter((i) => ok_.has(i.productId)).map((i) => ({ cartId: cart.id, productId: i.productId, qty: i.qty })),
      skipDuplicates: true,
    }),
  ]);
  return ok(await cartDto(user.id));
});

export const DELETE = route(async (req) => {
  const user = await customerOrGuest(req);
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  return ok(await cartDto(user.id));
});
