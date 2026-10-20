import { prisma, type User } from "@repo/db";
import type { StaffRole } from "@repo/types";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "./env";
import { ApiError } from "./http";

/*
 * Sessions are signed JWTs in httpOnly cookies.
 *   autohub_customer       storefront: guest or registered customer
 *   autohub_admin_session  dashboard staff (same name the dashboard's proxy checks)
 * The frontends proxy /api/* to this service (next.config rewrites), so the
 * browser receives these cookies from its own site: host-only, first-party,
 * Secure + HttpOnly + SameSite=Lax in production. COOKIE_DOMAIN stays unset
 * unless web and dashboard deliberately share a parent domain.
 */
export const CUSTOMER_COOKIE = "autohub_customer";
export const ADMIN_COOKIE = "autohub_admin_session";

const DAY = 24 * 60 * 60;
const GUEST_TTL = 365 * DAY;
const CUSTOMER_TTL = 30 * DAY;

interface Claims {
  sub: string;
  typ: "customer" | "staff";
}

async function sign(claims: Claims, ttl: number) {
  return new SignJWT({ typ: claims.typ })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(env.authSecret);
}

async function verify(token: string | undefined, typ: Claims["typ"]): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.authSecret, { algorithms: ["HS256"] });
    return payload.typ === typ && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function setCookie(name: string, value: string, maxAge: number | undefined) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    domain: env.cookieDomain,
    ...(maxAge ? { maxAge } : {}),
  });
}

async function clearCookie(name: string) {
  (await cookies()).set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    domain: env.cookieDomain,
    maxAge: 0,
  });
}

/* ---------- passwords ---------- */

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, hash: string | null) => (hash ? bcrypt.compare(p, hash) : Promise.resolve(false));

/* ---------- customers ---------- */

export async function currentCustomer(req: NextRequest): Promise<User | null> {
  const id = await verify(req.cookies.get(CUSTOMER_COOKIE)?.value, "customer");
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.role === "CUSTOMER" ? user : null;
}

/** The current customer, creating an anonymous guest session on first use (cart, wishlist, checkout). */
export async function customerOrGuest(req: NextRequest): Promise<User> {
  const user = await currentCustomer(req);
  if (user) return user;
  const guest = await prisma.user.create({ data: { role: "CUSTOMER", isGuest: true } });
  await startCustomerSession(guest);
  return guest;
}

export async function startCustomerSession(user: Pick<User, "id" | "isGuest">) {
  const ttl = user.isGuest ? GUEST_TTL : CUSTOMER_TTL;
  await setCookie(CUSTOMER_COOKIE, await sign({ sub: user.id, typ: "customer" }, ttl), ttl);
}

export const endCustomerSession = () => clearCookie(CUSTOMER_COOKIE);

/* ---------- staff ---------- */

export async function startStaffSession(user: Pick<User, "id">, remember: boolean) {
  const ttl = remember ? 30 * DAY : 12 * 60 * 60;
  await setCookie(ADMIN_COOKIE, await sign({ sub: user.id, typ: "staff" }, ttl), remember ? ttl : undefined);
}

export const endStaffSession = () => clearCookie(ADMIN_COOKIE);

/** Staff member behind the request, or 401/403. `admin` = only the ADMIN role. */
export async function requireStaff(req: NextRequest, need: StaffRole = "OPERATOR"): Promise<User> {
  const id = await verify(req.cookies.get(ADMIN_COOKIE)?.value, "staff");
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user || user.role === "CUSTOMER") throw new ApiError("UNAUTHORIZED", "Нэвтэрнэ үү");
  if (need === "ADMIN" && user.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Энэ үйлдэлд админ эрх шаардлагатай");
  // keep "Сүүлд нэвтэрсэн" roughly current without a write on every request
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 5 * 60e3)
    void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return user;
}

/* ---------- login throttling (in the database: shared by all serverless instances) ---------- */

const WINDOW_MIN = 15;
const MAX = 10;

/** Client IP as Vercel reports it (the first x-forwarded-for hop), else a shared bucket. */
const clientIp = (req: NextRequest) =>
  req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** 10 failed attempts per IP + key within 15 minutes → 429 until the window ends. */
export async function throttle(req: NextRequest, key: string): Promise<{ fail: () => Promise<void>; reset: () => Promise<void> }> {
  const k = `${clientIp(req)}|${key.toLowerCase()}`.slice(0, 300);
  const a = await prisma.loginThrottle.findUnique({ where: { key: k } });
  if (a && a.until.getTime() > Date.now() && a.count >= MAX)
    throw new ApiError("RATE_LIMITED", "Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу");
  return {
    // one atomic upsert, so parallel failures on different instances all count
    fail: async () => {
      await prisma.$executeRaw`
        INSERT INTO "LoginThrottle" ("key", "count", "until")
        VALUES (${k}, 1, now() + make_interval(mins => ${WINDOW_MIN}))
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "LoginThrottle"."until" > now() THEN "LoginThrottle"."count" + 1 ELSE 1 END,
          "until" = CASE WHEN "LoginThrottle"."until" > now() THEN "LoginThrottle"."until"
                         ELSE now() + make_interval(mins => ${WINDOW_MIN}) END`;
    },
    reset: async () => {
      await prisma.loginThrottle.deleteMany({ where: { key: k } });
    },
  };
}

/** Drop finished windows (called from the periodic expiry sweep). */
export async function pruneThrottle(): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { until: { lt: new Date() } } });
}
