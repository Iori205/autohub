import { prisma } from "@repo/db";
import { ok, route } from "@/lib/http";

/** Ажиллаж буй эсэх + өгөгдлийн сангийн шалгалт. */
export const GET = route(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ ok: true, time: new Date().toISOString() });
});
