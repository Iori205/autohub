import type { ApiErrorBody } from "@repo/types";

/*
 * Хөтөч /api/v1-ийг самбарын өөрийн домэйноос дуудаж, next.config нь apps/service (API_URL) руу дамжуулна.
 * Тиймээс админы httpOnly күүки энэ домэйнд first-party байж, proxy.ts ч харж чадна.
 */
const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** 401 ирэхэд дуудагдана — lib/api/auth.ts тохируулж, хугацаа дууссан сессийг /login руу буцаана. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

/** Ажилтны сесс күүкитэй /api/v1 дуудах; алдаа серверийн монгол мессежийг агуулна. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const e = (data as ApiErrorBody | null)?.error;
    if (res.status === 401 && !path.startsWith("/admin/auth/")) onUnauthorized?.();
    throw new ApiError(res.status, e?.code ?? "INTERNAL", e?.message ?? "Алдаа гарлаа. Дахин оролдоно уу", e?.fields);
  }
  return data as T;
}
