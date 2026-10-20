import { paymentInput, type QPayInvoiceDto } from "@repo/types";
import { body, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { openInvoice } from "@/lib/payments";

/**
 * Төлбөрийн дэлгэцийн QPay нэхэмжлэх: { qrImage, qrText, urls (банкны апп), expiresAt }.
 * Хүчинтэй нэхэмжлэх байвал дахин ашиглана, үгүй бол шинэ 15 минутынхыг үүсгэнэ (хугацаа дууссаны дараа ч).
 */
export const POST = route(async (req) => {
  const { number } = await body(req, paymentInput);
  return ok<QPayInvoiceDto>(await openInvoice(await ownOrder(req, number)));
});
