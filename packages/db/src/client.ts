import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Supabase-ийн transaction pooler (DATABASE_URL, порт 6543) дээрх Prisma клиент; процесс бүрт нэг, анх хэрэглэхэд үүсдэг тул build-д DB URL хэрэггүй.
 * Prisma-ийн pg adapter нэргүй prepared statement илгээдэг ба transaction pooler үүнийг дэмждэг тул `pgbouncer=true` хэрэггүй.
 */
function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repo root");
  // DATABASE_POOL_MAX нь instance бүрийн холболтын дээд хязгаар: нэг холболттой тест DB-д 1,
  // Vercel дээр цөөн (анхдагч 3), удаан ажилладаг серверт pg-ийн анхдагч 10.
  const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10);
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max,
      // Vercel дээр: түр зогссон instance pooler-ийн слот барихгүйн тулд сул холболтыг хурдан чөлөөлж,
      // pooler дүүрсэн үед хүлээж гацахын оронд хүсэлтийг унагана
      ...(process.env.VERCEL ? { idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 } : {}),
    }),
  });
}

const g = globalThis as unknown as { __autohubPrisma?: PrismaClient };

function instance(): PrismaClient {
  return (g.__autohubPrisma ??= create());
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = instance();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
