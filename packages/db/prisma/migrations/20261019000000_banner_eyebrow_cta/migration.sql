-- Home hero slides are banners: tag above the title and the button label
ALTER TABLE "Banner" ADD COLUMN "eyebrow" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Banner" ADD COLUMN "ctaLabel" TEXT NOT NULL DEFAULT '';
