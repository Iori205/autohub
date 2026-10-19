"use client";

import { getDb, reload } from "../db";
import type { Banner, Campaign } from "../types";
import { api } from "./client";

/* Home-page banners and discount campaigns → /admin/banners, /admin/campaigns. */

export async function saveBanner(input: Omit<Banner, "id">, id?: string) {
  const body = {
    eyebrow: input.eyebrow,
    title: input.title,
    subtitle: input.sub,
    ctaLabel: input.cta,
    link: input.link,
    sortOrder: input.order,
    active: input.active,
  };
  await api(id ? `/admin/banners/${id}` : "/admin/banners", { method: id ? "PATCH" : "POST", body });
  await reload("banners");
}

export async function deleteBanner(id: string) {
  await api(`/admin/banners/${id}`, { method: "DELETE" });
  await reload("banners");
}

export async function toggleBanner(id: string) {
  const b = getDb()?.banners.find((x) => x.id === id);
  if (!b) return;
  await api(`/admin/banners/${id}`, { method: "PATCH", body: { active: !b.active } });
  await reload("banners");
}

/** Swap display order with the neighbour above (-1) or below (+1). */
export async function moveBanner(id: string, dir: -1 | 1) {
  const sorted = [...(getDb()?.banners ?? [])].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
  await api("/admin/banners/reorder", { method: "POST", body: { ids: sorted.map((b) => b.id) } });
  await reload("banners");
}

/** "Бүх бараа" / "Ангилал: …" / "Брэнд: …" → the API's target + id. */
function target(label: string) {
  const db = getDb();
  const [kind, name] = label.split(/:\s*/) as [string, string | undefined];
  if (kind === "Ангилал") return { target: "CATEGORY", categoryId: db?.categories.find((c) => c.name === name)?.id ?? null, brandId: null };
  if (kind === "Брэнд") return { target: "BRAND", categoryId: null, brandId: db?.brands.find((b) => b.name === name)?.id ?? null };
  return { target: "ALL", categoryId: null, brandId: null };
}

const campaignBody = (c: Omit<Campaign, "id" | "categoryId" | "brandId">) => ({
  name: c.name,
  percent: c.pct,
  ...target(c.target),
  startsAt: c.from,
  endsAt: c.to,
  active: c.active,
});

export async function saveCampaign(input: Omit<Campaign, "id" | "categoryId" | "brandId">, id?: string) {
  await api(id ? `/admin/campaigns/${id}` : "/admin/campaigns", { method: id ? "PUT" : "POST", body: campaignBody(input) });
  await reload("campaigns");
}

export async function deleteCampaign(id: string) {
  await api(`/admin/campaigns/${id}`, { method: "DELETE" });
  await reload("campaigns");
}

export async function toggleCampaign(id: string) {
  const c = getDb()?.campaigns.find((x) => x.id === id);
  if (!c) return;
  await api(`/admin/campaigns/${id}`, { method: "PUT", body: campaignBody({ ...c, active: !c.active }) });
  await reload("campaigns");
}
