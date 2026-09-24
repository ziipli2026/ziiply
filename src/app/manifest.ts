import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ziiply – halvempi ostoskori",
    short_name: "Ziiply",
    description:
      "Mobiili-MVP ostoskorin, EAN-haun, muistilistan ja kauppavertailun testaamiseen.",

    start_url: "/",
    scope: "/",

    display: "standalone",
    orientation: "portrait",

    background_color: "#f8fafc",
    theme_color: "#16a34a",

    categories: ["shopping", "utilities"],
    lang: "fi",

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
