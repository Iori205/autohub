import type { PublicSettingsDto } from "@repo/types";
import { ok, route } from "@/lib/http";
import { deliveryFee, getSetting } from "@/lib/settings";

/** Дэлгүүрт зориулсан мэдээлэл ба хүргэлтийн үнэ. */
export const GET = route(async () => {
  const [store, delivery] = await Promise.all([getSetting("store"), getSetting("delivery")]);
  return ok<PublicSettingsDto>({
    store,
    delivery: { ...delivery, zones: delivery.zones.filter((z) => z.active) },
    // арга бүрийн суурь үнэ (УБ хүргэлт delivery.freeOver-оос дээш үнэгүй)
    fees: { UB: deliveryFee("UB", 0, delivery), PICKUP: 0, COUNTRY: deliveryFee("COUNTRY", 0, delivery) },
  });
});
