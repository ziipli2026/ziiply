import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.3"],

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.s-cloud.fi",
      },
      {
        protocol: "https",
        hostname: "www.s-kaupat.fi",
      },
      {
        protocol: "https",
        hostname: "api.s-kaupat.fi",
      },
    ],
  },
};

export default nextConfig;
