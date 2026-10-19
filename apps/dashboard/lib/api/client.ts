import type { ApiErrorBody } from "@repo/types";

/** apps/service base URL. The admin session is an httpOnly cookie set by the service. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

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

/** Called on a 401 — set by lib/api/auth.ts so an expired session goes back to /login. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

/** Call /api/v1 with the staff session cookie; errors carry the server's Mongolian message. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
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
