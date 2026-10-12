import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma client over the pooled connection (Supabase pooler / DATABASE_URL).
 * One instance per process; in dev the global keeps it across hot reloads.
 */
function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repo root");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const g = globalThis as unknown as { __autohubPrisma?: PrismaClient };

export const prisma: PrismaClient = g.__autohubPrisma ?? create();
if (process.env.NODE_ENV !== "production") g.__autohubPrisma = prisma;
