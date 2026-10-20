import { paymentInput, type PaymentStateDto } from "@repo/types";
import { body, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { cancelPayment } from "@/lib/payments";

/** «Төлбөрийг цуцлах»: нэхэмжлэхийг цуцална; захиалга хадгалагдаж, дараа төлж болно. */
export const POST = route(async (req) => {
  const { number } = await body(req, paymentInput);
  return ok<PaymentStateDto>(await cancelPayment(await ownOrder(req, number)));
});
