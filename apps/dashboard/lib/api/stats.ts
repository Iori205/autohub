"use client";

import { useEffect, useState } from "react";
import type { OverviewDto, ReportDto } from "@repo/types";
import { useDb } from "../db";
import { toast } from "../ui";
import { api } from "./client";

/*
 * Серверийн тооцоо (/admin/stats/*): Улаанбаатарын өдөр, орлого = төлөгдсөн, буцаагдаагүй захиалга (хүргэлттэй).
 * Админы өгөгдлийн кэш өөрчлөгдөх бүрт дахин татдаг тул өөр газрын төлөвийн өөрчлөлт тоонд шууд тусна.
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
  // шинэ хугацааг ачаалах зуур өмнөх тоо харагдсаар байна
  return data?.value ?? null;
}

export const useOverview = (days: 7 | 30 | 90) => useStat<OverviewDto>(`/admin/stats/overview?days=${days}`);
export const useReport = (period: "day" | "week" | "month") => useStat<ReportDto>(`/admin/stats/report?period=${period}`);
