import { unstable_rethrow } from "next/navigation";
import type { ApiErrorBody } from "@repo/types";

/**
 * Where /api/v1 lives: in the browser this site itself (next.config rewrites
 * /api/* to apps/service, so the session cookie is first-party); on the
 * Next.js server apps/service directly (API_URL, server-only).
 */
function base() {
  if (typeof window !== "undefined") return "";
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set — the URL of apps/service");
  return url.replace(/\/$/, "");
}

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

/**
 * Call /api/v1. Sends the session cookie (guest/customer) and never caches,
 * so prices, stock and order status are always current.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "include",
      cache: "no-store",
    });
  } catch (e) {
    // Next.js signals "dynamic page" / redirects by throwing from fetch — let those through
    unstable_rethrow(e);
    throw new ApiError(0, "NETWORK", "Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const e = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? "INTERNAL", e?.message ?? "Алдаа гарлаа. Дахин оролдоно уу", e?.fields);
  }
  return data as T;
}
