import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Repo-ийн язгуур дахь нэг .env-ийг Prisma, apps/service, frontend-үүд хуваалцана.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.join(root, ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx seed/index.ts",
  },
  // Migration-д шууд (pool-гүй) холболт хэрэгтэй; апп ажиллахдаа
  // pool-той DATABASE_URL-ийг driver adapter-аар ашиглана (src/client.ts).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
