import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow file uploads through Server Actions (default is 1MB).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      // The marketplace browse moved to the homepage; old /projects links
      // (bookmarks, indexed pages, emails) forward with their filters intact.
      // Bare source doesn't match /projects/:slug — detail pages stay put.
      {
        source: "/projects",
        destination: "/",
        permanent: true,
      },
      // Project slug changes: keep old public URLs alive (permanent 308).
      {
        source: "/projects/uptown-meadowvale",
        destination: "/projects/derry-lane-towns",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
