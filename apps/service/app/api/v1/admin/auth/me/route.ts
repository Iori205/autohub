import type { StaffDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { staffDto } from "@/lib/staff";

export const GET = route(async (req) => ok<StaffDto>(staffDto(await requireStaff(req))));
