import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist", "client");
const publicPath = "/worldline-detector/";
const productionOrigin = "https://chemistry-wow.com";

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

const indexPath = path.join(outputRoot, "index.html");
if (!existsSync(indexPath)) {
  fail("dist/client/index.html was not generated");
}

const html = readFileSync(indexPath, "utf8");
for (const forbiddenText of [
  "@vite/client",
  "localhost:2013",
  "/worldline-detector/worldline-detector/",
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
console.log(`Public URL: ${productionOrigin}${publicPath}`);
