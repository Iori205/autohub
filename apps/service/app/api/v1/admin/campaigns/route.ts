import { prisma } from "@repo/db";
import { campaignInput, type CampaignDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";
import { campaignDto } from "@/lib/serialize";

export const GET = route(async (req) => {
  await requireStaff(req);
  const rows = await prisma.campaign.findMany({ orderBy: { startsAt: "asc" }, include: { category: true, brand: true } });
  return ok<CampaignDto[]>(rows.map(campaignDto));
});

export const POST = route(async (req) => {
  await requireStaff(req);
  const c = await body(req, campaignInput);
  const row = await prisma.campaign.create({
    data: {
      ...c,
      categoryId: c.target === "CATEGORY" ? c.categoryId : null,
      brandId: c.target === "BRAND" ? c.brandId : null,
      startsAt: new Date(`${c.startsAt}T00:00:00Z`),
      endsAt: new Date(`${c.endsAt}T00:00:00Z`),
    },
    include: { category: true, brand: true },
  });
  return created<CampaignDto>(campaignDto(row));
});
