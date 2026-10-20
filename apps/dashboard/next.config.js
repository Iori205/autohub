import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// One .env at the repo root (see .env.example).
let root = path.dirname(fileURLToPath(import.meta.url));
while (!existsSync(path.join(root, "turbo.json")) && path.dirname(root) !== root) root = path.dirname(root);
nextEnv.loadEnvConfig(root);

/*
 * apps/service base URL (server-only, never sent to the browser). The browser
 * calls /api/* on this site and Next.js forwards it there, so session cookies
 * are first-party for this domain (separate *.vercel.app domains can't share
 * cookies). Server-side fetches use API_URL directly (lib/api/client.ts).
 * Rewrites are fixed at build time, so API_URL must be set for `next build`.
 */
const PRODUCTION = ["phase-production-build", "phase-production-server"];

/** @param {string} phase @returns {import('next').NextConfig} */
export default function nextConfig(phase) {
  // `next build` / `next start` need the real URL; dev and `next typegen` (type-checks) fall back to the local service
  const strict = PRODUCTION.includes(phase) && !process.argv.includes("typegen");
  const apiUrl = (process.env.API_URL || (strict ? "" : "http://localhost:4000")).replace(/\/$/, "");
  if (apiUrl) process.env.API_URL = apiUrl;

  return {
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "DENY" },
          ],
        },
      ];
    },
    async rewrites() {
      if (!apiUrl) throw new Error("API_URL is not set — the URL of apps/service, e.g. https://autohub-service.vercel.app");
      return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
    },
  };
}
