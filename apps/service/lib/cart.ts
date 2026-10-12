import { prisma } from "@repo/db";
import type { CartDto } from "@repo/types";
import { productSummary, productSummaryInclude } from "./serialize";

export async function cartDto(userId: string): Promise<CartDto> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { orderBy: { addedAt: "asc" }, include: { product: { include: productSummaryInclude } } } },
  });
  // hidden/deleted products drop out of the cart view
  const items = (cart?.items ?? [])
    .filter((i) => i.product.active)
    .map((i) => ({ product: productSummary(i.product), qty: i.qty, lineTotal: i.product.price * i.qty }));
  return {
    items,
    count: items.reduce((a, i) => a + i.qty, 0),
    subtotal: items.reduce((a, i) => a + i.lineTotal, 0),
  };
}

export async function ensureCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
}

/**
 * Called when a guest logs into an existing account: the guest's cart lines,
 * wishlist and orders move to the account, then the guest record is removed.
 */
export async function adoptGuest(guestId: string, userId: string) {
  if (guestId === userId) return;
  await prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({ where: { userId: guestId }, include: { items: true } });
    if (guestCart?.items.length) {
      const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {} });
      for (const it of guestCart.items)
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId: it.productId } },
          create: { cartId: cart.id, productId: it.productId, qty: it.qty },
          update: { qty: { increment: it.qty } },
        });
    }
    const wish = await tx.wishlistItem.findMany({ where: { userId: guestId } });
    for (const w of wish)
      await tx.wishlistItem.upsert({
        where: { userId_productId: { userId, productId: w.productId } },
        create: { userId, productId: w.productId },
        update: {},
      });
    await tx.order.updateMany({ where: { userId: guestId }, data: { userId } });
    await tx.user.delete({ where: { id: guestId } });
  });
}
