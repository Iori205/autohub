import { paymentInput, type PaymentStateDto } from "@repo/types";
import { body, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { checkPayment } from "@/lib/payments";

/** Төлбөрийн дэлгэцийн polling (хэдэн секунд тутам). QPay-ээс асууж төлөгдсөн / хугацаа дууссан гэж тэмдэглэнэ. */
export const POST = route(async (req) => {
  const { number } = await body(req, paymentInput);
  return ok<PaymentStateDto>(await checkPayment(await ownOrder(req, number)));
});
