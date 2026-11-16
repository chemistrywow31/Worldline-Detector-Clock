import type { NextConfig } from "next";
import { assetPrefixFor, resolveBasePath } from "./scripts/base-path.mjs";

const nextConfig: NextConfig = {
  output: "export",
  // Static assets are published by Nginx below the base path: the full
  // production URL by default, or the WORLDLINE_BASE_PATH prefix when set.
  assetPrefix: assetPrefixFor(resolveBasePath()),
  trailingSlash: true,
};

export default nextConfig;
