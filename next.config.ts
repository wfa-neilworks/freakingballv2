import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "freakingball.com", "www.freakingball.com", "freakingballv2.pages.dev"],
    },
  },
};

export default nextConfig;
