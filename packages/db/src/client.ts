import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma client over the pooled connection (Supabase pooler / DATABASE_URL).
 * One instance per process; in dev the global keeps it across hot reloads.
 * Created on first use, so importing @repo/db (e.g. during `next build`)
 * doesn't need the database URL.
 */
function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repo root");
  // DATABASE_POOL_MAX: optional cap on connections (e.g. 1 for the single-connection test DB)
  const max = Number(process.env.DATABASE_POOL_MAX) || undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, ...(max ? { max } : {}) }) });
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
