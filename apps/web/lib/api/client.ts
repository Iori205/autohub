import { unstable_rethrow } from "next/navigation";
import type { ApiErrorBody } from "@repo/types";

/**
 * /api/v1 хаана байх: хөтөчид энэ сайт өөрөө (next.config /api/*-ийг apps/service руу дамжуулдаг тул сессийн күүки first-party),
 * Next.js сервер дээр apps/service шууд (API_URL, зөвхөн серверт).
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

/** /api/v1 дуудах. Сессийн күүкиг (зочин/хэрэглэгч) илгээж, хэзээ ч кэшлэхгүй тул үнэ, нөөц, захиалгын төлөв үргэлж шинэ. */
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
    // Next.js «динамик хуудас» / redirect-ийг fetch-ээс шидэж дохиолдог — тэдгээрийг дамжуулна
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
