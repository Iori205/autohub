import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The repo shares one .env at the root (see .env.example); load it here
// so `next dev` in apps/service sees DATABASE_URL, AUTH_SECRET, QPay keys …
loadEnvConfig(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));

const nextConfig: NextConfig = {
  // API only — no pages, so nothing to optimise for the browser.
  poweredByHeader: false,
};

export default nextConfig;
