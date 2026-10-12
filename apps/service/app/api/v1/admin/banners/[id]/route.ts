import { prisma } from "@repo/db";
import { bannerInput, type BannerDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, noContent, ok, route } from "@/lib/http";

type Ctx = RouteContext<"/api/v1/admin/banners/[id]">;

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  const b = await prisma.banner.update({
    where: { id: (await params).id },
    data: await body(req, bannerInput.partial()),
    omit: { createdAt: true, updatedAt: true },
  });
  return ok<BannerDto>(b);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireStaff(req);
  await prisma.banner.delete({ where: { id: (await params).id } });
  return noContent();
});
