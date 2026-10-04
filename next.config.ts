import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.3"],

  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        // V746_STATIC_UI_ASSET_CACHE:
        // Ziiplyn omat public/-grafiikat ovat käyttöliittymäassetteja. Selain saa
        // pitää niitä paikallisessa cachessa reloadien välillä; lyhyt revalidate
        // varmistaa silti, että samalla tiedostonimellä julkaistu uusi kuva vaihtuu.
        source: "/:path*\\.(png|jpg|jpeg|webp|svg|gif|ico|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imgproxy-retcat.assets.schwarz",
      },
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
