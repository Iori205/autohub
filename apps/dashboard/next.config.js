import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// Repo-ийн язгуур дахь нэг .env (.env.example-ийг үз).
let root = path.dirname(fileURLToPath(import.meta.url));
while (!existsSync(path.join(root, "turbo.json")) && path.dirname(root) !== root) root = path.dirname(root);
nextEnv.loadEnvConfig(root);

/*
 * apps/service-ийн хаяг (зөвхөн серверт, хөтөч рүү илгээгддэггүй). Хөтөч энэ сайтын /api/*-ийг дуудаж Next.js тийш дамжуулдаг тул
 * күүки энэ домэйнд first-party (тусдаа *.vercel.app домэйн күүки хуваалцаж чаддаггүй). Rewrite build үед тогтдог тул `next build`-д API_URL заавал.
 */
const PRODUCTION = ["phase-production-build", "phase-production-server"];

/** @param {string} phase @returns {import('next').NextConfig} */
export default function nextConfig(phase) {
  // `next build` / `next start`-д жинхэнэ URL хэрэгтэй; dev болон `next typegen` локал сервис рүү буцна
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
