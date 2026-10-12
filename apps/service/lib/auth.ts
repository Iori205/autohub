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
 * Cookies are shared across ports on localhost and across subdomains in
 * production (COOKIE_DOMAIN), so web/dashboard can call the API with credentials.
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
  (await cookies()).set(name, "", { httpOnly: true, sameSite: "lax", path: "/", domain: env.cookieDomain, maxAge: 0 });
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

/* ---------- login throttling (per process; fine for one instance) ---------- */

const attempts = new Map<string, { n: number; until: number }>();
const WINDOW = 15 * 60e3;
const MAX = 10;

export function throttle(req: NextRequest, key: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const k = `${ip}|${key.toLowerCase()}`;
  const now = Date.now();
  const a = attempts.get(k);
  if (a && a.until > now && a.n >= MAX)
    throw new ApiError("RATE_LIMITED", "Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу");
  return {
    fail: () => attempts.set(k, a && a.until > now ? { n: a.n + 1, until: a.until } : { n: 1, until: now + WINDOW }),
    reset: () => attempts.delete(k),
  };
}
