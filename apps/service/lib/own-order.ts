import { prisma } from "@repo/db";
import type { NextRequest } from "next/server";
import { currentCustomer } from "./auth";
import { notFound } from "./http";

/** An order that belongs to the requesting customer session (404 otherwise). */
export async function ownOrder(req: NextRequest, number: string) {
  const user = await currentCustomer(req);
  const o = user ? await prisma.order.findFirst({ where: { number: number.toUpperCase(), userId: user.id } }) : null;
  if (!o) throw notFound("Захиалга олдсонгүй");
  return o;
}
