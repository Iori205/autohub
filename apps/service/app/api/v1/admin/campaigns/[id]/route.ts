import { prisma } from "@repo/db";
import { campaignInput, type CampaignDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, noContent, ok, route } from "@/lib/http";
import { campaignDto } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/admin/campaigns/[id]">;

/** Send the full campaign (same body as create); simple toggles send { …, active }. */
export const PUT = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const c = await body(req, campaignInput);
  const row = await prisma.campaign.update({
    where: { id: (await params).id },
    data: {
      ...c,
      categoryId: c.target === "CATEGORY" ? c.categoryId : null,
      brandId: c.target === "BRAND" ? c.brandId : null,
      startsAt: new Date(`${c.startsAt}T00:00:00Z`),
      endsAt: new Date(`${c.endsAt}T00:00:00Z`),
    },
    include: { category: true, brand: true },
  });
  return ok<CampaignDto>(campaignDto(row));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  await prisma.campaign.delete({ where: { id: (await params).id } });
  return noContent();
});
