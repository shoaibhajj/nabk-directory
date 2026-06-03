import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "**.replit.app",
        "**.replit.dev",
        "localhost:3000",
        "**.vercel.app",
      ],
    },
  },
};

export default nextConfig;
