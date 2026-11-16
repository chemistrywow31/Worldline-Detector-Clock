import path from "node:path";
import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { DEFAULT_BASE_PATH, resolveBasePath } from "./scripts/base-path.mjs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

// Nginx serves the site under this prefix (`/worldline-detector` unless
// WORLDLINE_BASE_PATH overrides it at build time), and `app/` puts it in font,
// image, and page URLs. The dev server publishes `public/` at the root instead,
// so strip the prefix here and keep one set of source paths.
const BASE_PATH = resolveBasePath();
const PRODUCTION_BASE_PATH = BASE_PATH.slice(0, -1);
const DEFAULT_CSS_URL = `url("${DEFAULT_BASE_PATH}`;

let appDirectory = "";

const productionBasePath: Plugin = {
  name: "worldline-detector-base-path",
  enforce: "pre",
  configResolved(config) {
    appDirectory = path.join(config.root, "app") + path.sep;
  },
  // CSS cannot read build settings, so `app/` stylesheets spell their URLs
  // with the default prefix; move them under the configured one.
  transform(code, id) {
    if (BASE_PATH === DEFAULT_BASE_PATH) {
      return null;
    }
    const file = id.split("?")[0];
    if (!file.endsWith(".css") || !file.startsWith(appDirectory)) {
      return null;
    }
    return { code: code.replaceAll(DEFAULT_CSS_URL, `url("${BASE_PATH}`), map: null };
  },
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      const url = request.url;
      if (url === PRODUCTION_BASE_PATH) {
        request.url = "/";
      } else if (url?.startsWith(`${PRODUCTION_BASE_PATH}/`)) {
        request.url = url.slice(PRODUCTION_BASE_PATH.length);
      }
      // The app router rebuilds its Request from `originalUrl`, so the prefix
      // has to come off both or the page route itself still 404s.
      if (request.url !== url) {
        (request as { originalUrl?: string }).originalUrl = request.url;
      }
      next();
    });
  },
};

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // `app/page.tsx` reads the prefix for its image URLs.
    define: {
      __WORLDLINE_BASE_PATH__: JSON.stringify(PRODUCTION_BASE_PATH),
    },
    server: {
      host: "0.0.0.0",
      port: 2013,
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      productionBasePath,
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
