import { prisma } from "@repo/db";
import { customerOrGuest } from "@/lib/auth";
import { intParam, noContent, notFound, route } from "@/lib/http";

type Ctx = RouteContext<"/api/v1/wishlist/[productId]">;

export const PUT = route<Ctx>(async (req, { params }) => {
  const productId = intParam((await params).productId);
  if (!(await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } })))
    throw notFound("Бараа олдсонгүй");
  const user = await customerOrGuest(req);
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId },
    update: {},
  });
  return noContent();
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const productId = intParam((await params).productId);
  const user = await customerOrGuest(req);
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  return noContent();
});
