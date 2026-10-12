import { paymentInput, type PaymentStateDto } from "@repo/types";
import { body, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { checkPayment } from "@/lib/payments";

/** Polling from the payment screen (every few seconds). Asks QPay; marks paid / expired. */
export const POST = route(async (req) => {
  const { number } = await body(req, paymentInput);
  return ok<PaymentStateDto>(await checkPayment(await ownOrder(req, number)));
});
