import { prisma } from "@repo/db";
import type { BannerDto } from "@repo/types";
import { ok, route } from "@/lib/http";

/** Нүүрний идэвхтэй баннерууд, дэлгэцийн дарааллаар. */
export const GET = route(async () => {
  const rows = await prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return ok<BannerDto[]>(
    rows.map((b) => ({
      id: b.id,
      eyebrow: b.eyebrow,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      link: b.link,
      imageUrl: b.imageUrl,
      sortOrder: b.sortOrder,
      active: b.active,
    })),
  );
});
