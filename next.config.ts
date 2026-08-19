import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/chunks.json", "./prisma/db/**"],
    "/app/**/*": ["./prisma/db/**"],
    "/**/*": ["./prisma/db/**"],
  },
};

export default nextConfig;
