// The URL prefix the static export is served under. Builds use the production
// prefix unless WORLDLINE_BASE_PATH names another one, e.g. `/p/worldline/`.
// Shared by next.config.ts, vite.config.ts, the static build script, and tests.

export const DEFAULT_BASE_PATH = "/worldline-detector/";
export const PRODUCTION_ORIGIN = "https://chemistry-wow.com";

// The prefix lands in HTML, CSS, JS, and output directory names, so each
// segment is limited to unreserved URL characters.
const SEGMENT = /^[A-Za-z0-9._~-]+$/;

/**
 * Reads WORLDLINE_BASE_PATH and normalizes it to `/segment/.../` with leading
 * and trailing slashes. Unset or empty falls back to DEFAULT_BASE_PATH.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string}
 */
export function resolveBasePath(env = process.env) {
  const value = env.WORLDLINE_BASE_PATH;
  if (value === undefined || value === "") {
    return DEFAULT_BASE_PATH;
  }

  const invalid = () =>
    new Error(
      `Invalid WORLDLINE_BASE_PATH ${JSON.stringify(value)}: expected a path such as "/p/worldline/" ` +
        "(leading slash, at least one segment of letters, digits, '.', '_', '~', or '-', no '.' or '..' segments)",
    );

  if (!value.startsWith("/")) {
    throw invalid();
  }

  const segments = value.slice(1).split("/");
  if (segments.at(-1) === "") {
    segments.pop();
  }

  if (
    segments.length === 0 ||
    segments.some((segment) => !SEGMENT.test(segment) || segment === "." || segment === "..")
  ) {
    throw invalid();
  }

  return `/${segments.join("/")}/`;
}

/**
 * next.config `assetPrefix` for a resolved base path. The default keeps the
 * production URL with its origin; any other base path is origin-relative.
 *
 * @param {string} basePath
 * @returns {string}
 */
export function assetPrefixFor(basePath) {
  const prefix = basePath.slice(0, -1);
  return basePath === DEFAULT_BASE_PATH ? `${PRODUCTION_ORIGIN}${prefix}` : prefix;
}
