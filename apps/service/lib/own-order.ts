import { prisma } from "@repo/db";
import type { NextRequest } from "next/server";
import { currentCustomer } from "./auth";
import { notFound } from "./http";

/** Хүсэлт илгээсэн хэрэглэгчийн сессийн захиалга (үгүй бол 404). */
export async function ownOrder(req: NextRequest, number: string) {
  const user = await currentCustomer(req);
  const o = user ? await prisma.order.findFirst({ where: { number: number.toUpperCase(), userId: user.id } }) : null;
  if (!o) throw notFound("Захиалга олдсонгүй");
  return o;
}
