import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// One .env at the repo root (see .env.example); NEXT_PUBLIC_API_URL comes from it.
let root = path.dirname(fileURLToPath(import.meta.url));
while (!existsSync(path.join(root, "turbo.json")) && path.dirname(root) !== root) root = path.dirname(root);
nextEnv.loadEnvConfig(root);

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
