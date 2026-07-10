import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@card-credit/contracts"],
  turbopack: { root: path.resolve(process.cwd(), "..") },
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:3001";
    return [
      { source: "/api/card-catalog/providers", destination: `${backend}/api/card-catalog/providers` },
      { source: "/api/card-catalog/products", destination: `${backend}/api/card-catalog/products` },
      { source: "/api/card-catalog/products/:presetId", destination: `${backend}/api/card-catalog/products/:presetId` },
      { source: "/api/admin/card-catalog/:path*", destination: `${backend}/api/admin/card-catalog/:path*` },
    ];
  },
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rcgv.vn",
      },
      {
        protocol: "https",
        hostname: "www.sacombank.com.vn",
      },
      {
        protocol: "https",
        hostname: "www.uob.com.vn",
      },
      {
        protocol: "https",
        hostname: "www.vib.com.vn",
      },
    ],
  },
};

export default nextConfig;
