"use client";

import { setDb } from "../db";
import { newId } from "../ids";
import type { Banner, Campaign } from "../types";

/* Home-page banners and discount campaigns — MOCK. Later: /banners, /campaigns. */

export async function saveBanner(input: Omit<Banner, "id">, id?: string) {
  setDb((db) =>
    id
      ? { banners: db.banners.map((b) => (b.id === id ? { ...input, id } : b)) }
      : { banners: [...db.banners, { ...input, id: newId("bn") }] },
  );
}

export async function deleteBanner(id: string) {
  setDb((db) => ({ banners: db.banners.filter((b) => b.id !== id) }));
}

export async function toggleBanner(id: string) {
  setDb((db) => ({ banners: db.banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b)) }));
}

/** Swap display order with the neighbour above (-1) or below (+1). */
export async function moveBanner(id: string, dir: -1 | 1) {
  setDb((db) => {
    const sorted = [...db.banners].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return {};
    const a = sorted[i]!;
    const b = sorted[j]!;
    return {
      banners: db.banners.map((x) =>
        x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x,
      ),
    };
  });
}

export async function saveCampaign(input: Omit<Campaign, "id">, id?: string) {
  setDb((db) =>
    id
      ? { campaigns: db.campaigns.map((c) => (c.id === id ? { ...input, id } : c)) }
      : { campaigns: [...db.campaigns, { ...input, id: newId("cp") }] },
  );
}

export async function deleteCampaign(id: string) {
  setDb((db) => ({ campaigns: db.campaigns.filter((c) => c.id !== id) }));
}

export async function toggleCampaign(id: string) {
  setDb((db) => ({ campaigns: db.campaigns.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) }));
}
