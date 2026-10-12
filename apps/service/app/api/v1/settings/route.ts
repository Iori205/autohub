import type { PublicSettingsDto } from "@repo/types";
import { ok, route } from "@/lib/http";
import { deliveryFee, getSetting } from "@/lib/settings";

/** Store info and delivery prices for the storefront. */
export const GET = route(async () => {
  const [store, delivery] = await Promise.all([getSetting("store"), getSetting("delivery")]);
  return ok<PublicSettingsDto>({
    store,
    delivery: { ...delivery, zones: delivery.zones.filter((z) => z.active) },
    // base fee per method (UB is free from delivery.freeOver)
    fees: { UB: deliveryFee("UB", 0, delivery), PICKUP: 0, COUNTRY: deliveryFee("COUNTRY", 0, delivery) },
  });
});
