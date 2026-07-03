import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIQWD — The Ultimate Broker Portal for New Homes",
    short_name: "LIQWD",
    description:
      "New-home and pre-construction projects across Canada & the U.S. — free buyer leads for verified agents.",
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
