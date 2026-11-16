import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, rmdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_BASE_PATH, PRODUCTION_ORIGIN, resolveBasePath } from "./base-path.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist", "client");
const publicPath = resolveBasePath();
const productionOrigin = PRODUCTION_ORIGIN;

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build:vinext"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

if (build.error) {
  throw build.error;
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

function fail(message) {
  console.error(`\nStatic package validation failed: ${message}`);
  process.exit(1);
}

// With an origin-relative assetPrefix, vinext mirrors the prefix on disk and
// writes `<prefix>/_next/` inside dist/client. Nginx maps the prefix onto
// dist/client itself, so move `_next/` up to the package root.
function liftPrefixedAssets() {
  const segments = publicPath.split("/").filter(Boolean);
  const nestedAssets = path.join(outputRoot, ...segments, "_next");
  if (!existsSync(nestedAssets)) {
    return;
  }

  const assets = path.join(outputRoot, "_next");
  if (existsSync(assets)) {
    fail(`both ${path.relative(projectRoot, nestedAssets)} and ${path.relative(projectRoot, assets)} exist`);
  }
  renameSync(nestedAssets, assets);

  for (let depth = segments.length; depth > 0; depth -= 1) {
    const directory = path.join(outputRoot, ...segments.slice(0, depth));
    if (readdirSync(directory).length > 0) {
      break;
    }
    rmdirSync(directory);
  }
}

function outputPathForUrl(value) {
  let pathname;

  if (value.startsWith(productionOrigin)) {
    pathname = new URL(value).pathname;
  } else if (value.startsWith(publicPath)) {
    pathname = value;
  } else {
    return null;
  }

  if (!pathname.startsWith(publicPath)) {
    return null;
  }

  const relativePath = decodeURIComponent(pathname.slice(publicPath.length));
  return path.join(outputRoot, relativePath || "index.html");
}

liftPrefixedAssets();

const indexPath = path.join(outputRoot, "index.html");
if (!existsSync(indexPath)) {
  fail("dist/client/index.html was not generated");
}

const html = readFileSync(indexPath, "utf8");
for (const forbiddenText of [
  "@vite/client",
  "localhost:2013",
  `${publicPath}${publicPath.slice(1)}`,
]) {
  if (html.includes(forbiddenText)) {
    fail(`index.html still contains ${forbiddenText}`);
  }
}

const referencedUrls = new Set(
  [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]),
);
const validationQueue = [...referencedUrls];

for (let index = 0; index < validationQueue.length; index += 1) {
  const value = validationQueue[index];
  // Root-relative URLs outside the base path would miss the package once it
  // is served under that prefix.
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith(publicPath)) {
    fail(`${value} is outside ${publicPath}`);
  }

  const referencedPath = outputPathForUrl(value);
  if (referencedPath && !existsSync(referencedPath)) {
    fail(`${value} does not map to an output file`);
  }

  if (!referencedPath || !value.includes(".css")) {
    continue;
  }

  const css = readFileSync(referencedPath, "utf8");
  for (const match of css.matchAll(/url\((?:"|')?([^"')]+)(?:"|')?\)/g)) {
    const cssUrl = match[1];
    if (!referencedUrls.has(cssUrl)) {
      referencedUrls.add(cssUrl);
      validationQueue.push(cssUrl);
    }
  }
}

console.log(`\nStatic package ready: ${path.relative(projectRoot, outputRoot)}`);
if (publicPath === DEFAULT_BASE_PATH) {
  console.log(`Public URL: ${productionOrigin}${publicPath}`);
} else {
  console.log(`Public path: ${publicPath}`);
}
