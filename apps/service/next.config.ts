import type { NextConfig } from "next";
// The repo shares one .env at the root (see .env.example).
import "./lib/load-env";

const nextConfig: NextConfig = {
  // API only — no pages, so nothing to optimise for the browser.
  poweredByHeader: false,
};

export default nextConfig;
