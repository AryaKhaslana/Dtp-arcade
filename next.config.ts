import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Ini bakal nge-bypass semua error TypeScript pas build di Vercel
    ignoreBuildErrors: true,
  }
};

export default nextConfig;