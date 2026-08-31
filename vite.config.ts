import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import hostingConfig from "./.openai/hosting.json";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

// Nginx serves the production site under this prefix, so `app/` hard-codes it
// into font, image, and page URLs. The dev server publishes `public/` at the
// root instead, so strip the prefix here and keep one set of source paths.
const PRODUCTION_BASE_PATH = "/worldline-detector";

const productionBasePath: Plugin = {
  name: "worldline-detector-base-path",
  enforce: "pre",
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
