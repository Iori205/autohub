import { paymentInput, type QPayInvoiceDto } from "@repo/types";
import { body, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { openInvoice } from "@/lib/payments";

/**
 * QPay invoice for the payment screen: { qrImage, qrText, urls (bank apps), expiresAt }.
 * Reuses a still-valid invoice; otherwise issues a new 15-minute one (also after expiry).
 */
export const POST = route(async (req) => {
  const { number } = await body(req, paymentInput);
  return ok<QPayInvoiceDto>(await openInvoice(await ownOrder(req, number)));
});
