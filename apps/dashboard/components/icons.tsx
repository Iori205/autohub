import {
  Armchair,
  BatteryCharging,
  CarFront,
  CircleDot,
  Cog,
  Disc,
  Droplet,
  Filter,
  Fuel,
  Lightbulb,
  Package,
  Snowflake,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "../lib/types";

/** Ангиллын дүрс — дэлгүүр ч ангилал бүрт ижил lucide дүрс хэрэглэдэг. */
export const CATEGORY_ICONS: Record<IconKey, LucideIcon> = {
  cog: Cog,
  disc: Disc,
  wrench: Wrench,
  filter: Filter,
  droplet: Droplet,
  lightbulb: Lightbulb,
  battery: BatteryCharging,
  wheel: CircleDot,
  car: CarFront,
  armchair: Armchair,
  package: Package,
  snowflake: Snowflake,
  fuel: Fuel,
  zap: Zap,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS) as IconKey[];
