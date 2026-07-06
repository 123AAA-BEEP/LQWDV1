import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIQWD — New & Pre-Construction Homes",
    short_name: "LIQWD",
    description:
      "Browse new and pre-construction condos, townhomes, and single-family homes across Canada & the U.S. — from Toronto to Miami.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b1220",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
