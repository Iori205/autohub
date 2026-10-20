import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma client over the pooled connection (Supabase pooler / DATABASE_URL).
 * One instance per process; in dev the global keeps it across hot reloads.
 * Created on first use, so importing @repo/db (e.g. during `next build`)
 * doesn't need the database URL.
 *
 * Serverless (Vercel): every function instance has its own small pool in
 * front of Supabase's transaction pooler (port 6543), which multiplexes them
 * onto a few real Postgres connections. Prisma's pg adapter sends unnamed
 * prepared statements, which the transaction pooler supports, so no
 * `pgbouncer=true` flag is needed (that flag is for Prisma's old query engine).
 */
function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repo root");
  // DATABASE_POOL_MAX caps connections per instance: 1 for the single-connection test DB,
  // a handful on Vercel (default 3 there), pg's default of 10 for a long-running server.
  const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10);
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max,
      // on Vercel: release idle connections quickly so suspended instances don't hold pooler
      // slots, and fail a request rather than hang when the pooler is saturated
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
