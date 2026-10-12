import { prisma } from "@repo/db";
import type { CampaignDto } from "@repo/types";
import { ok, route } from "@/lib/http";
import { campaignDto } from "@/lib/serialize";
import { ubDay } from "@/lib/time";

/** Campaigns running today. */
export const GET = route(async () => {
  const today = new Date(`${ubDay()}T00:00:00Z`);
  const rows = await prisma.campaign.findMany({
    where: { active: true, startsAt: { lte: today }, endsAt: { gte: today } },
    include: { category: true, brand: true },
    orderBy: { startsAt: "asc" },
  });
  return ok<CampaignDto[]>(rows.map(campaignDto));
});
