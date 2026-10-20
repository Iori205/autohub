import type { NextConfig } from "next";
// Repo нэг .env-ийг язгуурт хуваалцана (.env.example-ийг үз).
import "./lib/load-env";

const nextConfig: NextConfig = {
  // Зөвхөн API — хуудасгүй тул хөтөчид зориулж оновчлох зүйлгүй.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] }];
  },
};

export default nextConfig;
