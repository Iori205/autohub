import { prisma } from "@repo/db";
import type { NextRequest } from "next/server";
import { checkPayment, validCallbackSig } from "@/lib/payments";

/**
 * QPay calls callback_url when an invoice is paid. The URL carries the order
 * number and an HMAC signature; the payment itself is confirmed with QPay's
 * payment/check, so a forged or replayed call can't mark anything paid.
 * Always answers 200 "SUCCESS" for valid signatures so QPay stops retrying.
 */
async function handle(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("order")?.toUpperCase() ?? "";
  if (!validCallbackSig(number, req.nextUrl.searchParams.get("sig"))) return new Response("invalid signature", { status: 403 });
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) return new Response("SUCCESS");
  try {
    await checkPayment(order);
  } catch (e) {
    // QPay will call again; polling will also catch it
    console.error("[qpay] callback check failed", number, (e as Error).message);
    return new Response("RETRY", { status: 502 });
  }
  return new Response("SUCCESS");
}

export const GET = handle;
export const POST = handle;
