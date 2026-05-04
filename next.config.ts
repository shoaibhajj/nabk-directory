import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    // Owners paste arbitrary public image URLs into their listings (gstatic
    // thumbnails, social CDNs, blog posts, etc.). Allow any HTTPS host so
    // <Image> doesn't error on the detail page; widen later only if SSRF
    // becomes a concern.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      // Use `**` so the glob crosses dots — Replit dev domains have multiple
      // subdomain segments (e.g. `<id>-<rand>.<region>.replit.dev`) and a
      // single `*` would only match a single label.
      allowedOrigins: [
        "**.replit.app",
        "**.replit.dev",
        "localhost:3000",
      ],
    },
  },
  allowedDevOrigins: ["**.replit.dev", "**.replit.app"],
};

export default nextConfig;
