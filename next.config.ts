import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
