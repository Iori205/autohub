import { endStaffSession } from "@/lib/auth";
import { noContent, route } from "@/lib/http";

export const POST = route(async () => {
  await endStaffSession();
  return noContent();
});
