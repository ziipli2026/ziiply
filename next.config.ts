import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.3"],

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
