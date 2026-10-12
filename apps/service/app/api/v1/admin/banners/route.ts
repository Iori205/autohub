import { prisma } from "@repo/db";
import { bannerInput, type BannerDto } from "@repo/types";
import { requireStaff } from "@/lib/auth";
import { body, created, ok, route } from "@/lib/http";

export const GET = route(async (req) => {
  await requireStaff(req);
  return ok<BannerDto[]>(await prisma.banner.findMany({ orderBy: { sortOrder: "asc" }, omit: { createdAt: true, updatedAt: true } }));
});

export const POST = route(async (req) => {
  await requireStaff(req);
  const input = await body(req, bannerInput);
  const last = await prisma.banner.aggregate({ _max: { sortOrder: true } });
  const b = await prisma.banner.create({
    data: { ...input, imageUrl: input.imageUrl ?? null, sortOrder: input.sortOrder ?? (last._max.sortOrder ?? 0) + 1 },
    omit: { createdAt: true, updatedAt: true },
  });
  return created<BannerDto>(b);
});
