import { paymentInput, type PaymentStateDto } from "@repo/types";
import { body, notFound, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { demoExpire, demoFailNextChecks, demoMode, demoPaid, paymentState } from "@/lib/payments";

/**
 * Зөвхөн DEMO_MODE (бусад үед 404) — дэлгүүрийн туршилтын товчнууд:
 * paid: төлөгдсөн болгоно (жинхэнэ төлбөр шиг нөөц хасагдана) · expired: 15 минутыг одоо дуусгана · error: дараагийн шалгалт QPay тасалдсан мэт унана
 */
export const POST = route<RouteContext<"/api/v1/payments/demo/[action]">>(async (req, { params }) => {
  if (!demoMode()) throw notFound();
  const action = (await params).action;
  if (!["paid", "expired", "error"].includes(action)) throw notFound();
  const { number } = await body(req, paymentInput);
  const order = await ownOrder(req, number);
  if (action === "paid") return ok<PaymentStateDto>(await demoPaid(order));
  if (action === "expired") return ok<PaymentStateDto>(await demoExpire(order));
  demoFailNextChecks(order.number);
  return ok<PaymentStateDto>(paymentState(order));
});
