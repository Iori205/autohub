import "./load-env";
import type { ApiErrorBody, ErrorCode } from "@repo/types";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYMENT_PROVIDER: 502,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** Throw anywhere in a handler; `route()` turns it into `{ error: { code, message } }`. */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Олдсонгүй") => new ApiError("NOT_FOUND", what);
export const conflict = (msg: string) => new ApiError("CONFLICT", msg);
export const badRequest = (msg: string, fields?: Record<string, string>) => new ApiError("BAD_REQUEST", msg, fields);

export function errorResponse(e: unknown): NextResponse<ApiErrorBody> {
  if (e instanceof ApiError)
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields } }, { status: STATUS[e.code] });
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of e.issues) fields[i.path.join(".") || "_"] ??= i.message;
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Оруулсан мэдээлэл буруу байна", fields } },
      { status: 422 },
    );
  }
  // Prisma unique / FK violations surface as 409 instead of 500.
  const code = (e as { code?: string })?.code;
  if (code === "P2002") return NextResponse.json({ error: { code: "CONFLICT", message: "Ийм бичлэг аль хэдийн байна" } }, { status: 409 });
  if (code === "P2003") return NextResponse.json({ error: { code: "CONFLICT", message: "Холбоотой бичлэг байгаа тул өөрчлөх боломжгүй" } }, { status: 409 });
  if (code === "P2025") return NextResponse.json({ error: { code: "NOT_FOUND", message: "Олдсонгүй" } }, { status: 404 });
  console.error("[api] unhandled error", e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Серверийн алдаа гарлаа" } }, { status: 500 });
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response> | Response;

/** Wrap a route handler: consistent errors, never a raw 500 page. */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
export const created = <T>(data: T) => NextResponse.json(data, { status: 201 });
export const noContent = () => new NextResponse(null, { status: 204 });

/** Parse a JSON body. Requiring application/json also blocks simple cross-site form posts. */
export async function body<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("BAD_REQUEST", "Content-Type: application/json шаардлагатай");
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError("BAD_REQUEST", "JSON буруу байна");
  }
  return schema.parse(json);
}

/** Parse the query string; repeated keys become arrays. */
export function query<S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of req.nextUrl.searchParams) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return schema.parse(out);
}

export const intParam = (s: string) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
};
