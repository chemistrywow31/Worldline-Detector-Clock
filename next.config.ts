import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static assets are published by Nginx below this production URL.
  assetPrefix: "https://chemistry-wow.com/worldline-detector",
  trailingSlash: true,
};

export default nextConfig;
