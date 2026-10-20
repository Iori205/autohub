import type { NextConfig } from "next";
// The repo shares one .env at the root (see .env.example).
import "./lib/load-env";

const nextConfig: NextConfig = {
  // API only — no pages, so nothing to optimise for the browser.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] }];
  },
};

export default nextConfig;
