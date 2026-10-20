import { NextResponse, type NextRequest } from "next/server";
import { env } from "./lib/env";

/**
 * API-г шууд дуудах хөтчид зориулсан CORS (проксигүй локал хөгжүүлэлт). Production-д frontend /api/*-ийг өөрийн origin-оос прокси хийдэг тул
 * CORS оролцохгүй; зөвхөн CORS_ORIGINS-д яг заасан origin credentials-тэй хандана.
 */
const origins = () => env.corsOrigins;

function cors(res: NextResponse, origin: string | null) {
  if (origin && origins().includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    const res = cors(new NextResponse(null, { status: 204 }), origin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", req.headers.get("access-control-request-headers") ?? "content-type");
    res.headers.set("Access-Control-Max-Age", "600");
    return res;
  }
  return cors(NextResponse.next(), origin);
}

export const config = { matcher: "/api/:path*" };
