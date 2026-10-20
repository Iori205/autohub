import { prisma } from "@repo/db";
import type { NextRequest } from "next/server";
import { checkPayment, validCallbackSig } from "@/lib/payments";

/**
 * QPay нэхэмжлэх төлөгдөхөд callback_url-г дуудна. URL-д захиалгын дугаар, HMAC гарын үсэг байх ба төлбөрийг QPay-ийн payment/check-ээр
 * дахин баталгаажуулдаг тул хуурамч/давтсан дуудлага юуг ч төлөгдсөн болгож чадахгүй. Гарын үсэг зөв бол QPay дахин оролдохоо болихоор 200 «SUCCESS».
 */
async function handle(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("order")?.toUpperCase() ?? "";
  if (!validCallbackSig(number, req.nextUrl.searchParams.get("sig"))) return new Response("invalid signature", { status: 403 });
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) return new Response("SUCCESS");
  try {
    await checkPayment(order);
  } catch (e) {
    // QPay дахин дуудна; polling ч мөн барина
    console.error("[qpay] callback check failed", number, (e as Error).message);
    return new Response("RETRY", { status: 502 });
  }
  return new Response("SUCCESS");
}

export const GET = handle;
export const POST = handle;
