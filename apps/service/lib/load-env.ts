import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

/**
 * Loads the repo-root .env (one file for the whole monorepo). Next.js only
 * reads .env files from the app folder, and route handlers run in a worker,
 * so this is imported by the modules that need env (http, env, proxy) rather
 * than only by next.config. Variables already set in the process win.
 */
function repoRoot(from: string) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, "turbo.json"))) return dir;
    if (path.dirname(dir) === dir) return from;
  }
}

loadEnvConfig(repoRoot(process.cwd()), process.env.NODE_ENV !== "production", { info: () => {}, error: console.error });
