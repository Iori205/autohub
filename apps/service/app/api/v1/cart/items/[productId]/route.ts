import { prisma } from "@repo/db";
import { cartItemInput } from "@repo/types";
import { customerOrGuest } from "@/lib/auth";
import { cartDto, ensureCart } from "@/lib/cart";
import { body, intParam, notFound, ok, route } from "@/lib/http";

type Ctx = RouteContext<"/api/v1/cart/items/[productId]">;

/** Нэг барааны тоо ширхэгийг тохируулна (байхгүй бол нэмнэ). */
export const PUT = route<Ctx>(async (req, { params }) => {
  const productId = intParam((await params).productId);
  const { qty } = await body(req, cartItemInput);
  if (!(await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } })))
    throw notFound("Бараа олдсонгүй");
  const user = await customerOrGuest(req);
  const cart = await ensureCart(user.id);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, qty },
    update: { qty },
  });
  return ok(await cartDto(user.id));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const productId = intParam((await params).productId);
  const user = await customerOrGuest(req);
  await prisma.cartItem.deleteMany({ where: { productId, cart: { userId: user.id } } });
  return ok(await cartDto(user.id));
});
