import { paymentInput, type PaymentStateDto } from "@repo/types";
import { body, notFound, ok, route } from "@/lib/http";
import { ownOrder } from "@/lib/own-order";
import { demoExpire, demoFailNextChecks, demoMode, demoPaid, paymentState } from "@/lib/payments";

/**
 * DEMO_MODE only (404 otherwise) — the storefront's test buttons:
 *   POST /payments/demo/paid     mark the order paid (stock is deducted like a real payment)
 *   POST /payments/demo/expired  end the 15-minute window now
 *   POST /payments/demo/error    the next payment check fails like a QPay outage
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
