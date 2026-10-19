"use client";

import { useEffect, useState } from "react";
import type { OverviewDto, ReportDto } from "@repo/types";
import { useDb } from "../db";
import { toast } from "../ui";
import { api } from "./client";

/*
 * Server-side figures (/admin/stats/*): Ulaanbaatar days, revenue = paid and
 * not refunded orders incl. delivery. Re-fetched whenever the admin data
 * cache changes, so a status change elsewhere updates the numbers.
 */

function useStat<T>(path: string): T | null {
  const db = useDb();
  const [data, setData] = useState<{ path: string; value: T } | null>(null);
  useEffect(() => {
    let live = true;
    api<T>(path)
      .then((value) => live && setData({ path, value }))
      .catch((e: Error) => toast(e.message, "err"));
    return () => {
      live = false;
    };
  }, [path, db]);
  // keep showing the previous figures while a new range loads
  return data?.value ?? null;
}

export const useOverview = (days: 7 | 30 | 90) => useStat<OverviewDto>(`/admin/stats/overview?days=${days}`);
export const useReport = (period: "day" | "week" | "month") => useStat<ReportDto>(`/admin/stats/report?period=${period}`);
