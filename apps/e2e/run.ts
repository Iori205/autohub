/*
 * End-to-end test of the whole stack on a THROWAWAY local database.
 *
 *   npm run test:e2e              web + dashboard
 *   npm run test:e2e -- web       storefront only
 *   npm run test:e2e -- dashboard dashboard (+ cross-app checks on the storefront)
 *
 * 1. starts a fresh `prisma dev` Postgres (never Supabase), migrates and seeds it
 * 2. builds and starts apps/service (DEMO_MODE) and the frontends on test ports
 *    (API 4100, web 3100, dashboard 3101) — your dev servers on 3000/3001/4000
 *    keep running
 * 3. drives the UIs with Playwright and checks the database directly
 * 4. writes apps/e2e/results/report.md and stops everything
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { Ctx, Result } from "./lib/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "apps/e2e/results");
const DB_NAME = "autohub-e2e";
const PORTS = { api: 4100, web: 3100, dashboard: 3101 };
const AUTH_SECRET = "e2e-test-secret-not-for-production-0123456789";
const which = process.argv[2] as "web" | "dashboard" | undefined;

const procs: ChildProcess[] = [];
const log = (s: string) => console.log(`\x1b[2m[e2e]\x1b[0m ${s}`);

function sh(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

function startDb(): string {
  const cwd = path.join(ROOT, "packages/db");
  spawnSync("npx", ["prisma", "dev", "rm", DB_NAME], { cwd });
  const out = sh("npx", ["prisma", "dev", "-d", "-n", DB_NAME], cwd);
  const url = out.match(/postgres:\/\/\S+/)?.[0];
  if (!url) throw new Error("could not start prisma dev:\n" + out);
  return url;
}

function stopDb() {
  const cwd = path.join(ROOT, "packages/db");
  spawnSync("npx", ["prisma", "dev", "stop", DB_NAME], { cwd });
  spawnSync("npx", ["prisma", "dev", "rm", DB_NAME], { cwd });
}

async function waitFor(url: string, ms = 120_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timed out waiting for ${url}`);
}

/** `next build` + `next start` (production build; `next dev` output in .next/dev is untouched). */
async function startApp(app: string, port: number, env: NodeJS.ProcessEnv, ready: string) {
  const cwd = path.join(ROOT, "apps", app);
  log(`building ${app}…`);
  sh("npx", ["next", "build"], cwd, env);
  const logFd = openSync(path.join(OUT, `${app}.log`), "w");
  const p = spawn("npx", ["next", "start", "--port", String(port)], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", logFd, logFd],
    detached: true,
  });
  procs.push(p);
  await waitFor(ready);
  log(`${app} on :${port}`);
}

function stopAll() {
  for (const p of procs) {
    try {
      if (p.pid) process.kill(-p.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  log("starting throwaway database…");
  const DATABASE_URL = startDb();
  const dbEnv = { DATABASE_URL, DIRECT_URL: DATABASE_URL };
  sh("npx", ["prisma", "migrate", "deploy"], path.join(ROOT, "packages/db"), dbEnv);
  // db:demo seed: the mock history moved to the present, so "today" figures are real
  sh("npx", ["prisma", "db", "seed"], path.join(ROOT, "packages/db"), { ...dbEnv, SEED_ADMIN_PASSWORD: "autohub123", SEED_NOW: "1" });
  log("database migrated and seeded (db:demo)");
  process.env.DATABASE_URL = DATABASE_URL; // for the DB assertions in the specs
  process.env.DATABASE_POOL_MAX = "1";

  const API = `http://localhost:${PORTS.api}`;
  const common = { NEXT_PUBLIC_API_URL: API };
  await startApp(
    "service",
    PORTS.api,
    {
      ...dbEnv,
      DATABASE_POOL_MAX: "1", // prisma dev (PGlite) drops extra connections
      AUTH_SECRET,
      DEMO_MODE: "true",
      QPAY_USERNAME: "",
      QPAY_PASSWORD: "",
      QPAY_INVOICE_CODE: "",
      PUBLIC_API_URL: API,
      CORS_ORIGINS: `http://localhost:${PORTS.web},http://localhost:${PORTS.dashboard}`,
    },
    `${API}/api/v1/health`,
  );
  // the dashboard spec also needs the storefront for its cross-app checks
  await startApp("web", PORTS.web, common, `http://localhost:${PORTS.web}/`);
  if (which !== "web") await startApp("dashboard", PORTS.dashboard, common, `http://localhost:${PORTS.dashboard}/login`);

  const ctx: Ctx = {
    api: API,
    web: `http://localhost:${PORTS.web}`,
    dashboard: `http://localhost:${PORTS.dashboard}`,
    authSecret: AUTH_SECRET,
    staffPassword: "autohub123",
    out: OUT,
  };
  const results: Result[] = [];
  if (which !== "dashboard") results.push(...(await (await import("./specs/web")).run(ctx)));
  if (which !== "web") results.push(...(await (await import("./specs/dashboard")).run(ctx)));

  const icon = { ok: "✅", fixed: "❌", todo: "⚠️", fail: "🔴" } as const;
  const rows = results.map((r) => `| ${r.page} | ${r.action} | ${icon[r.status]} | ${r.notes.replace(/\|/g, "\\|")} |`);
  const md = ["| Page | Action | Status | Notes |", "| --- | --- | --- | --- |", ...rows].join("\n");
  writeFileSync(path.join(OUT, "report.md"), md + "\n");
  const failed = results.filter((r) => r.status === "fail");
  console.log("\n" + md + "\n");
  console.log(`${results.length - failed.length}/${results.length} passed → apps/e2e/results/report.md`);
  process.exitCode = failed.length ? 1 : 0;
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  stopAll();
  stopDb();
}
