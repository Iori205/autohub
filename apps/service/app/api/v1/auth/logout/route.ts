import { endCustomerSession } from "@/lib/auth";
import { noContent, route } from "@/lib/http";

export const POST = route(async () => {
  await endCustomerSession();
  return noContent();
});
