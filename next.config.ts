import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Portable JSON index — no native DB bindings required on Vercel.
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
