import type { NextConfig } from "next";
const { setupDevPlatform } = require("@cloudflare/next-on-pages/next-dev");

if (process.env.NODE_ENV === "development") {
  setupDevPlatform().catch(console.error);
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
