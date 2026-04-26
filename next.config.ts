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
      allowedOrigins: ["*.replit.app", "*.replit.dev", "localhost:5000"],
    },
  },
  allowedDevOrigins: ["*.replit.dev", "*.replit.app"],
};

export default nextConfig;
