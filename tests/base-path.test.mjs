import assert from "node:assert/strict";
import test from "node:test";
import { assetPrefixFor, DEFAULT_BASE_PATH, resolveBasePath } from "../scripts/base-path.mjs";

test("falls back to the production base path", () => {
  assert.equal(DEFAULT_BASE_PATH, "/worldline-detector/");
  assert.equal(resolveBasePath(undefined), DEFAULT_BASE_PATH);
  assert.equal(resolveBasePath(""), DEFAULT_BASE_PATH);
  assert.equal(resolveBasePath("/worldline-detector"), DEFAULT_BASE_PATH);
});

test("normalizes custom base paths to leading and trailing slashes", () => {
  assert.equal(resolveBasePath("/p/worldline/"), "/p/worldline/");
  assert.equal(resolveBasePath("/p/worldline"), "/p/worldline/");
  assert.equal(resolveBasePath("/viewer/p/worldline/"), "/viewer/p/worldline/");
  assert.equal(resolveBasePath("/a.b_c~d-e/"), "/a.b_c~d-e/");
});

test("rejects base paths that cannot be used as a URL and directory prefix", () => {
  for (const value of [
    "/",
    "//",
    "p/worldline/",
    "/p//worldline/",
    "/p/../worldline/",
    "/./",
    "/..",
    "https://example.com/p/",
    "//example.com/p/",
    "/p worldline/",
    "/p/world\"line/",
    "/p/world)line/",
    "/p\\worldline/",
    "/p/worldline/?x=1",
    "/p/worldline/#x",
    "/p/%2e%2e/",
  ]) {
    assert.throws(() => resolveBasePath(value), /Invalid WORLDLINE_BASE_PATH/, value);
  }
});

test("keeps the production origin in the asset prefix only for the default", () => {
  assert.equal(assetPrefixFor(DEFAULT_BASE_PATH), "https://chemistry-wow.com/worldline-detector");
  assert.equal(assetPrefixFor("/p/worldline/"), "/p/worldline");
  assert.equal(assetPrefixFor("/viewer/p/worldline/"), "/viewer/p/worldline");
});
