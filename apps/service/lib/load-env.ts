import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

/**
 * Repo-ийн язгуур .env-ийг ачаална. Next.js зөвхөн апп хавтасны .env-ийг уншдаг, route handler worker-т ажилладаг тул
 * env хэрэгтэй модуль бүр (http, env, proxy) үүнийг импортолно. Процесст аль хэдийн байгаа утга давуу.
 */
function repoRoot(from: string) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, "turbo.json"))) return dir;
    if (path.dirname(dir) === dir) return from;
  }
}

loadEnvConfig(repoRoot(process.cwd()), process.env.NODE_ENV !== "production", { info: () => {}, error: console.error });
