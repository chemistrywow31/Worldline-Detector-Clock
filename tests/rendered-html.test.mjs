import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the divergence meter shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>未知世界線のシュタインズ・ゲート｜世界線探測儀<\/title>/i);
  assert.match(html, /世界線探測儀/);
  assert.match(html, /未知世界線のシュタインズ・ゲート/);
  assert.match(html, /時間/);
  assert.match(html, /世界線/);
  assert.match(html, /時序觀測 \/\/ 啟動 \/\/ El Psy Kongroo/);
  assert.match(html, /language-switch/);
  assert.match(html, /og\.png/);
  assert.match(html, /page-emblem/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps the experience local and drives the 3D scene dynamically", async () => {
  const [page, scene, styles, layout, emblem, wordmark, socialCard, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DivergenceScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/fgl-emblem-render.png", import.meta.url)),
    readFile(new URL("../public/unknown-worldline-steins-gate-wordmark.png", import.meta.url)),
    readFile(new URL("../public/og.png", import.meta.url)),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /createWorldline/);
  assert.match(page, /setWorldline\(createWorldline\(\)\)/);
  assert.match(page, /className="scene-date"/);
  assert.match(page, /numericDate/);
  assert.match(page, /requestFullscreen/);
  assert.match(page, /0\.HHMMSS/);
  assert.match(page, /getClockReading/);
  assert.match(page, /type Locale = "zh-TW" \| "en" \| "ja"/);
  assert.match(page, /CHRONOGRAPH \/\/ ACTIVE \/\/ El Psy Kongroo/);
  assert.match(page, /時系列観測 \/\/ 起動 \/\/ El Psy Kongroo/);
  assert.match(page, /STEINS_GATE_READING = "1\.048596"/);
  assert.match(page, /Math\.abs\(Number\(reading\) - STEINS_GATE_VALUE\)/);
  assert.match(page, /if \(distance === 0\)/);
  assert.match(page, /境界面上的命運石之門/);
  assert.match(page, /Open the Steins Gate/);
  assert.match(page, /境界面上のシュタインズゲート/);
  assert.match(page, /fortune\.score === 100/);
  assert.match(page, /Math\.min\(11, Math\.round/);
  assert.match(page, /wordmark-code">FGL</);
  assert.doesNotMatch(page, /FGL \/\/ 204/);
  assert.match(page, /className="page-emblem"/);
  assert.doesNotMatch(page, /className="fgl-emblem"/);
  assert.match(styles, /url\("\/fgl-emblem-render\.png"\)/);
  assert.match(page, /unknown-worldline-steins-gate-wordmark\.png/);
  assert.match(page, /未知世界線のシュタインズ・ゲート/);
  assert.doesNotMatch(page, /<svg className="destiny-title"/);
  assert.match(page, /width="640"/);
  assert.match(page, /mixBlendMode: "lighten"/);
  assert.match(styles, /mix-blend-mode: lighten/);
  assert.match(styles, /mask-image: linear-gradient\(to bottom/);
  assert.match(styles, /font-family: "Shippori Mincho"/);
  assert.match(styles, /font-family: "Yuji Syuku"/);
  assert.match(styles, /shippori-mincho-111-800-normal\.woff2/);
  assert.match(styles, /yuji-syuku-119-400-normal\.woff2/);
  assert.doesNotMatch(layout, /@fontsource\/shippori-mincho\/800\.css/);
  assert.doesNotMatch(layout, /@fontsource\/yuji-syuku\/400\.css/);
  assert.match(layout, /images: \["\/og\.png"\]/);
  assert.doesNotMatch(page, /WEBGL \/ 3D|scene-badge/);
  assert.match(page, /<DivergenceScene chars=\{shownChars\} scanning=\{scanning\}/);
  assert.doesNotMatch(page, /localStorage|fetch\(|\/api\//);
  assert.match(scene, /WebGLRenderer/);
  assert.match(scene, /MeshPhysicalMaterial/);
  assert.match(scene, /UnrealBloomPass/);
  assert.match(scene, /DIGIT_SUPPORT_WIRES/);
  assert.match(scene, /context\.arc\(200, 425, 10/);
  assert.match(scene, /createCathodePaths/);
  assert.match(scene, /new Path2D/);
  assert.match(scene, /M76 162 L180 162/);
  assert.match(scene, /M68 78 L184 78 L118 243/);
  assert.match(scene, /M148 78 L73 313 L190 313/);
  assert.match(scene, /M128 82 L128 392/);
  assert.doesNotMatch(scene, /M171 78 L171 398/);
  assert.match(scene, /M189 78 L110 78 C108 117 102 181 95 239/);
  assert.match(scene, /C99 399 75 366 72 316/);
  assert.doesNotMatch(scene, /C88 145 80 229 76 314/);
  assert.match(scene, /usesFineSupportWires = char === "4" \|\| char === "5"/);
  assert.doesNotMatch(scene, /M145 80 L76 264 L145 264 Z/);
  assert.match(scene, /createInactiveCathodeTexture/);
  assert.match(scene, /createBrushedMetalTextures/);
  assert.match(scene, /createPhenolicBoardTextures/);
  assert.match(scene, /RoundedBoxGeometry/);
  assert.match(scene, /RoomEnvironment/);
  assert.match(scene, /roughnessMap: brushedTextures\.roughnessMap/);
  assert.match(scene, /bumpMap: brushedTextures\.bumpMap/);
  assert.match(scene, /const upperHousing/);
  assert.match(scene, /const lowerHousing/);
  assert.match(scene, /const recessedSeam/);
  assert.doesNotMatch(scene, /const screwSlotGeometry/);
  assert.match(scene, /const rubberFootGeometry/);
  assert.match(scene, /const boardScrewMaterial/);
  assert.doesNotMatch(scene, /boardScrewGeometry, screwMaterial/);
  assert.match(scene, /new RoundedBoxGeometry\(12\.18, \.15, 3\.5, 2, \.014\)/);
  assert.match(scene, /const columns = 125/);
  assert.match(scene, /const rows = 33/);
  assert.match(scene, /new THREE\.CircleGeometry\(\.0205, 12\)/);
  assert.match(scene, /const socketFlange/);
  assert.match(scene, /new THREE\.TubeGeometry\(pinCurve, 5, \.011, 5, false\)/);
  assert.match(scene, /const bluePot/);
  assert.match(scene, /const lyingCapacitor/);
  assert.match(scene, /for \(let index = 0; index < 8; index \+= 1\)/);
  assert.match(scene, /const greenResistorMaterial/);
  assert.match(scene, /device\.position\.y = 0/);
  assert.doesNotMatch(scene, /emissiveIntensity: \.86/);
  assert.match(scene, /PlaneGeometry\(1\.22, 1\.66\)/);
  assert.match(scene, /PlaneGeometry\(1\.26, 1\.72\)/);
  assert.match(scene, /new THREE\.Vector2\(\.415, 1\.7\)/);
  assert.match(scene, /new THREE\.Vector2\(\.096, 2\.235\)/);
  assert.match(scene, /new THREE\.Vector2\(\.029, 2\.296\)/);
  assert.match(scene, /lyingCapacitor\.rotation\.y = 1\.36/);
  assert.match(scene, /const lyingPolarityStripe/);
  assert.match(scene, /const shoulderStripe/);
  assert.match(scene, /const greenLeadMaterial/);
  assert.match(scene, /new THREE\.CylinderGeometry\(\.254, \.284, \.205, 24, 1, true, \.35, \.82\)/);
  assert.doesNotMatch(scene, /const capacitorScoreMaterial/);
  assert.match(scene, /new THREE\.LatheGeometry\(bodyProfile, 48\)/);
  assert.match(scene, /new THREE\.LatheGeometry\(resistorProfile, 36\)/);
  assert.doesNotMatch(scene, /fillText\(/);
  assert.equal(emblem.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(wordmark.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(socialCard.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.match(packageJson, /"three":/);
  assert.match(packageJson, /"@fontsource\/shippori-mincho":/);
  assert.match(packageJson, /"@fontsource\/yuji-syuku":/);
});
