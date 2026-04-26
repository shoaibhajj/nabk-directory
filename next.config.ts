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
    remotePatterns: [
      { protocol: "https", hostname: "**.replit.app" },
      { protocol: "https", hostname: "**.replit.dev" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
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
        "localhost:5000",
      ],
    },
  },
  allowedDevOrigins: ["**.replit.dev", "**.replit.app"],
};

export default nextConfig;
