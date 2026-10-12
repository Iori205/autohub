import type { User } from "@repo/db";
import type { StaffDto } from "@repo/types";

export const staffDto = (u: User): StaffDto => ({
  id: u.id,
  name: u.name ?? "",
  email: u.email ?? "",
  role: u.role === "ADMIN" ? "ADMIN" : "OPERATOR",
  lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
});
