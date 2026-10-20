import { prisma, type User } from "@repo/db";
import type { StaffRole } from "@repo/types";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "./env";
import { ApiError } from "./http";

/*
 * Сесс нь httpOnly күүки дэх гарын үсэгтэй JWT: autohub_customer — дэлгүүр (зочин эсвэл бүртгэлтэй), autohub_admin_session — самбарын ажилтан.
 * Frontend-үүд /api/*-ийг энэ сервис рүү прокси хийдэг тул күүки хөтчид өөрийн сайтаас host-only, first-party, Secure + HttpOnly + SameSite=Lax ирнэ.
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

/* ---------- нууц үг ---------- */

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, hash: string | null) => (hash ? bcrypt.compare(p, hash) : Promise.resolve(false));

/* ---------- хэрэглэгч ---------- */

export async function currentCustomer(req: NextRequest): Promise<User | null> {
  const id = await verify(req.cookies.get(CUSTOMER_COOKIE)?.value, "customer");
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.role === "CUSTOMER" ? user : null;
}

/** Одоогийн хэрэглэгч; анх ашиглахад (сагс, хүслийн жагсаалт, checkout) нэргүй зочны сесс үүсгэнэ. */
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

/* ---------- ажилтан ---------- */

export async function startStaffSession(user: Pick<User, "id">, remember: boolean) {
  const ttl = remember ? 30 * DAY : 12 * 60 * 60;
  await setCookie(ADMIN_COOKIE, await sign({ sub: user.id, typ: "staff" }, ttl), remember ? ttl : undefined);
}

export const endStaffSession = () => clearCookie(ADMIN_COOKIE);

/** Хүсэлтийн ард байгаа ажилтан, эсвэл 401/403. `admin` = зөвхөн ADMIN эрх. */
export async function requireStaff(req: NextRequest, need: StaffRole = "OPERATOR"): Promise<User> {
  const id = await verify(req.cookies.get(ADMIN_COOKIE)?.value, "staff");
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user || user.role === "CUSTOMER") throw new ApiError("UNAUTHORIZED", "Нэвтэрнэ үү");
  if (need === "ADMIN" && user.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Энэ үйлдэлд админ эрх шаардлагатай");
  // «Сүүлд нэвтэрсэн»-ийг хүсэлт бүрт бичихгүйгээр ойролцоо шинэ байлгана
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 5 * 60e3)
    void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return user;
}

/* ---------- нэвтрэх оролдлогын хязгаар (өгөгдлийн санд: бүх serverless instance хуваалцана) ---------- */

const WINDOW_MIN = 15;
const MAX = 10;

/** Vercel-ийн мэдээлсэн клиент IP (x-forwarded-for-ийн эхний утга), байхгүй бол нийтийн сав. */
const clientIp = (req: NextRequest) =>
  req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** IP + түлхүүр бүрт 15 минутад 10 амжилтгүй оролдлого → цонх дуустал 429. */
export async function throttle(req: NextRequest, key: string): Promise<{ fail: () => Promise<void>; reset: () => Promise<void> }> {
  const k = `${clientIp(req)}|${key.toLowerCase()}`.slice(0, 300);
  const a = await prisma.loginThrottle.findUnique({ where: { key: k } });
  if (a && a.until.getTime() > Date.now() && a.count >= MAX)
    throw new ApiError("RATE_LIMITED", "Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу");
  return {
    // нэг атомар upsert тул өөр instance дээрх зэрэгцээ алдаа бүгд тоологдоно
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

/** Дууссан цонхнуудыг устгана (хугацааны тогтмол цэвэрлэгээнээс дуудагдана). */
export async function pruneThrottle(): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { until: { lt: new Date() } } });
}
