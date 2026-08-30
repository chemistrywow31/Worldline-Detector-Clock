"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

type DivergenceSceneProps = {
  chars: string[];
  scanning: boolean;
  loadingLabel: string;
};

type DigitSurface = {
  core: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
};

type WireSegment = [number, number, number, number];

type BrushedMetalTextures = {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
};

const DIGIT_SUPPORT_WIRES: Record<string, WireSegment[]> = {
  "0": [[128, 474, 128, 399]],
  "1": [[128, 474, 128, 398]],
  "2": [[120, 474, 120, 395]],
  "3": [[118, 474, 118, 400]],
  "4": [[151, 474, 151, 398], [128, 474, 128, 392]],
  "5": [[129, 474, 129, 392]],
  "6": [[129, 474, 129, 392]],
  "7": [[120, 474, 120, 397]],
  "8": [[129, 474, 129, 391]],
  "9": [[90, 474, 90, 398]],
};

const CATHODE_PATH_DATA: Record<string, string[]> = {
  "0": [
    "M128 74 C90 74 74 116 74 235 C74 353 92 399 128 399 C165 399 182 353 182 235 C182 116 166 74 128 74 Z",
    "M128 76 L128 398",
    "M76 162 L180 162",
  ],
  "1": ["M73 132 L128 78 L128 398", "M72 162 L187 162"],
  "2": [
    "M68 162 C68 108 96 76 128 76 C161 76 184 108 185 162 L68 162",
    "M185 162 L68 397 L182 397",
    "M120 78 L120 395",
  ],
  "3": [
    "M68 78 L184 78 L118 243",
    "M118 243 C154 244 184 277 184 318 C184 371 160 400 126 400 C91 400 68 371 68 318",
    "M68 318 L184 318",
    "M118 79 L118 400",
  ],
  "4": [
    "M148 78 L73 313 L190 313",
    "M148 78 L151 398",
    "M128 82 L128 392",
  ],
  "5": [
    "M189 78 L110 78 C108 117 102 181 95 239 C117 227 143 226 163 240 C181 253 190 282 190 316 C190 365 167 397 134 399 C99 399 75 366 72 316",
    "M128 82 L129 392",
    "M72 316 L190 316",
  ],
  "6": [
    "M171 78 C148 133 116 226 76 317",
    "M76 317 C76 261 99 216 130 216 C165 216 185 256 185 309 C185 365 163 400 130 400 C94 400 76 370 76 317 Z",
    "M129 222 L129 392",
    "M80 317 L178 317",
  ],
  "7": [
    "M68 78 L185 78 L98 398",
    "M120 78 L120 397",
    "M68 162 L171 162",
  ],
  "8": [
    "M128 76 C97 76 82 101 82 146 C82 185 100 205 128 214 C97 228 74 268 74 318 C74 368 97 398 130 398 C165 398 187 368 187 318 C187 268 162 228 128 214 C158 205 176 184 176 146 C176 100 160 76 128 76 Z",
    "M128 82 L129 391",
    "M78 316 L181 316",
  ],
  "9": [
    "M128 76 C90 76 68 108 68 158 C68 209 91 237 128 237 C166 237 188 209 188 158 C188 108 167 76 128 76 Z",
    "M128 80 L128 237",
    "M72 162 L184 162",
    "M179 201 C162 260 131 333 90 398",
  ],
};

const CATHODE_MAIN_PATH_INDEXES: Record<string, number[]> = {
  "0": [0],
  "1": [0],
  "2": [0, 1],
  "3": [0, 1, 2],
  "4": [0, 1],
  "5": [0],
  "6": [0, 1],
  "7": [0],
  "8": [0],
  "9": [0, 3],
};

function createCathodePaths(char: string) {
  const pathData = CATHODE_PATH_DATA[char] ?? [];
  const mainIndexes = CATHODE_MAIN_PATH_INDEXES[char] ?? [];
  const main = new Path2D();
  const detail = new Path2D();
  pathData.forEach((data, index) => {
    const target = mainIndexes.includes(index) ? main : detail;
    target.addPath(new Path2D(data));
  });
  return { main, detail };
}

function strokeCathode(context: CanvasRenderingContext2D, path: Path2D, lineWidth: number) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = "#ff3f05";
  context.shadowBlur = 16;
  context.strokeStyle = "rgba(255, 60, 5, .17)";
  context.lineWidth = lineWidth * 2.8;
  context.stroke(path);
  context.shadowBlur = 14;
  context.strokeStyle = "#ff6418";
  context.lineWidth = lineWidth;
  context.stroke(path);
  context.shadowBlur = 3;
  context.strokeStyle = "#ffe0ad";
  context.lineWidth = Math.max(1.5, lineWidth * .28);
  context.stroke(path);
  context.restore();
}

function drawSupportWires(context: CanvasRenderingContext2D, char: string) {
  const segments = char === "."
    ? [[124, 478, 194, 435] satisfies WireSegment]
    : DIGIT_SUPPORT_WIRES[char] ?? [];

  context.save();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(126, 79, 50, .78)";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.beginPath();
  segments.forEach(([fromX, fromY, toX, toY]) => {
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
  });
  context.stroke();
  context.restore();
}

function createDigitTexture(char: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawSupportWires(context, char);
    context.fillStyle = "#ff8a2b";
    context.shadowColor = "#ff4a08";
    context.shadowBlur = 28;

    if (char === ".") {
      context.beginPath();
      context.arc(200, 425, 10, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 4;
      context.fillStyle = "#ffe0a0";
      context.beginPath();
      context.arc(200, 425, 3.5, 0, Math.PI * 2);
      context.fill();
    } else {
      const { main, detail } = createCathodePaths(char);
      const usesFineSupportWires = char === "4" || char === "5";

      if (usesFineSupportWires) {
        context.save();
        context.globalAlpha = .52;
        strokeCathode(context, detail, 2.1);
        context.restore();
        strokeCathode(context, main, 5.2);
      } else {
        strokeCathode(context, main, 5.2);
        strokeCathode(context, detail, 3);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createInactiveCathodeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 1.2;
    context.strokeStyle = "rgba(147, 119, 89, .085)";
    ["0", "4", "9", "3", "1", "7", "8", "2", "5", "6"].forEach((digit, index) => {
      const { main, detail } = createCathodePaths(digit);
      context.save();
      context.translate((index % 3 - 1) * 1.5, ((index * 2) % 3 - 1) * 1.1);
      context.stroke(main);
      context.stroke(detail);
      context.restore();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function deterministicNoise(seed: number) {
  const value = Math.sin(seed * 91.173 + 17.719) * 43758.5453;
  return value - Math.floor(value);
}

function createBrushedMetalTextures(): BrushedMetalTextures {
  const width = 1024;
  const height = 256;
  const colorCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = roughnessCanvas.width = bumpCanvas.width = width;
  colorCanvas.height = roughnessCanvas.height = bumpCanvas.height = height;

  const color = colorCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const bump = bumpCanvas.getContext("2d");

  if (color && roughness && bump) {
    const base = color.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#858883");
    base.addColorStop(.5, "#70736f");
    base.addColorStop(1, "#5d605c");
    color.fillStyle = base;
    color.fillRect(0, 0, width, height);
    roughness.fillStyle = "#cacaca";
    roughness.fillRect(0, 0, width, height);
    bump.fillStyle = "#808080";
    bump.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 1) {
      const grain = deterministicNoise(y * 5.31);
      const grainAlpha = .008 + Math.abs(grain - .5) * .045;
      color.fillStyle = grain > .5
        ? `rgba(255,255,248,${grainAlpha})`
        : `rgba(8,10,9,${grainAlpha})`;
      color.fillRect(0, y, width, 1);
      const roughnessValue = 178 + Math.round(grain * 52);
      roughness.fillStyle = `rgb(${roughnessValue},${roughnessValue},${roughnessValue})`;
      roughness.fillRect(0, y, width, 1);
      const bumpValue = 120 + Math.round(grain * 17);
      bump.fillStyle = `rgb(${bumpValue},${bumpValue},${bumpValue})`;
      bump.fillRect(0, y, width, 1);
    }

    for (let index = 0; index < 1100; index += 1) {
      const x = Math.floor(deterministicNoise(index * 7.13 + 1) * width);
      const y = Math.floor(deterministicNoise(index * 7.13 + 2) * height);
      const length = 18 + Math.floor(deterministicNoise(index * 7.13 + 3) * 245);
      const alpha = .012 + deterministicNoise(index * 7.13 + 4) * .052;
      const bright = deterministicNoise(index * 7.13 + 5) > .47;
      color.fillStyle = bright
        ? `rgba(245,247,239,${alpha})`
        : `rgba(10,12,11,${alpha * .82})`;
      color.fillRect(x, y, Math.min(length, width - x), 1);
      const roughnessValue = bright ? 158 : 222;
      roughness.fillStyle = `rgba(${roughnessValue},${roughnessValue},${roughnessValue},.34)`;
      roughness.fillRect(x, y, Math.min(length, width - x), 1);
      const bumpValue = bright ? 137 : 116;
      bump.fillStyle = `rgba(${bumpValue},${bumpValue},${bumpValue},.28)`;
      bump.fillRect(x, y, Math.min(length, width - x), 1);
    }

    for (let index = 0; index < 46; index += 1) {
      const topEdge = deterministicNoise(index * 11.7) > .5;
      const y = topEdge
        ? 2 + Math.floor(deterministicNoise(index * 11.7 + 1) * 7)
        : height - 9 + Math.floor(deterministicNoise(index * 11.7 + 1) * 7);
      const x = Math.floor(deterministicNoise(index * 11.7 + 2) * width);
      const length = 24 + Math.floor(deterministicNoise(index * 11.7 + 3) * 115);
      color.fillStyle = "rgba(232,234,226,.085)";
      color.fillRect(x, y, Math.min(length, width - x), 1);
      roughness.fillStyle = "rgba(108,108,108,.3)";
      roughness.fillRect(x, y, Math.min(length, width - x), 1);
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  [colorMap, roughnessMap, bumpMap].forEach((texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  });
  return { colorMap, roughnessMap, bumpMap };
}

function createPhenolicBoardTextures(): BrushedMetalTextures {
  const width = 1024;
  const height = 320;
  const colorCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = roughnessCanvas.width = bumpCanvas.width = width;
  colorCanvas.height = roughnessCanvas.height = bumpCanvas.height = height;

  const color = colorCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const bump = bumpCanvas.getContext("2d");

  if (color && roughness && bump) {
    const boardTone = color.createLinearGradient(0, 0, 0, height);
    boardTone.addColorStop(0, "#c4a069");
    boardTone.addColorStop(.48, "#ad8753");
    boardTone.addColorStop(1, "#957044");
    color.fillStyle = boardTone;
    color.fillRect(0, 0, width, height);
    roughness.fillStyle = "#d0d0d0";
    roughness.fillRect(0, 0, width, height);
    bump.fillStyle = "#808080";
    bump.fillRect(0, 0, width, height);

    for (let index = 0; index < 2600; index += 1) {
      const x = deterministicNoise(index * 5.73 + 1) * width;
      const y = deterministicNoise(index * 5.73 + 2) * height;
      const length = 5 + deterministicNoise(index * 5.73 + 3) * 74;
      const alpha = .012 + deterministicNoise(index * 5.73 + 4) * .045;
      const lightFiber = deterministicNoise(index * 5.73 + 5) > .46;
      color.strokeStyle = lightFiber
        ? `rgba(255,238,192,${alpha})`
        : `rgba(63,37,18,${alpha * .8})`;
      color.lineWidth = deterministicNoise(index * 5.73 + 6) > .9 ? 1.25 : .55;
      color.beginPath();
      color.moveTo(x, y);
      color.lineTo(Math.min(width, x + length), y + (deterministicNoise(index * 5.73 + 7) - .5) * 2.2);
      color.stroke();

      const surfaceValue = lightFiber ? 137 : 119;
      bump.strokeStyle = `rgba(${surfaceValue},${surfaceValue},${surfaceValue},${alpha * 1.8})`;
      bump.lineWidth = 1;
      bump.beginPath();
      bump.moveTo(x, y);
      bump.lineTo(Math.min(width, x + length), y);
      bump.stroke();
    }

    for (let index = 0; index < 520; index += 1) {
      const x = deterministicNoise(index * 13.17 + 4) * width;
      const y = deterministicNoise(index * 13.17 + 5) * height;
      const radius = .3 + deterministicNoise(index * 13.17 + 6) * 1.1;
      color.fillStyle = `rgba(45,25,12,${.02 + deterministicNoise(index * 13.17 + 7) * .055})`;
      color.beginPath();
      color.arc(x, y, radius, 0, Math.PI * 2);
      color.fill();
      roughness.fillStyle = "rgba(244,244,244,.18)";
      roughness.fillRect(x, y, 1, 1);
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  [colorMap, roughnessMap, bumpMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  });
  return { colorMap, roughnessMap, bumpMap };
}

function disposeMaterial(material: THREE.Material) {
  const withMaps = material as THREE.Material & Record<string, unknown>;
  for (const key of ["map", "alphaMap", "normalMap", "bumpMap", "roughnessMap", "metalnessMap", "emissiveMap"]) {
    const value = withMaps[key];
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

export function DivergenceScene({ chars, scanning, loadingLabel }: DivergenceSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef(chars);
  const digitCharsRef = useRef<string[]>([]);
  const scanningRef = useRef(scanning);
  const digitSurfacesRef = useRef<DigitSurface[]>([]);
  const digitTexturesRef = useRef<THREE.Texture[]>([]);
  const charsSignature = chars.join("");

  useEffect(() => {
    const nextChars = charsSignature.split("");
    charsRef.current = nextChars;
    if (digitSurfacesRef.current.length !== 8) return;

    nextChars.forEach((char, index) => {
      if (digitCharsRef.current[index] === char) return;
      digitTexturesRef.current[index]?.dispose();
      const texture = createDigitTexture(char);
      const surface = digitSurfacesRef.current[index];
      surface.core.map = texture;
      surface.glow.map = texture;
      surface.core.needsUpdate = true;
      surface.glow.needsUpdate = true;
      digitTexturesRef.current[index] = texture;
      digitCharsRef.current[index] = char;
    });
  }, [charsSignature]);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const pointer = new THREE.Vector2(0, 0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const start = async () => {
      await document.fonts.ready;
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070807);
      scene.fog = new THREE.FogExp2(0x070807, .016);

      const camera = new THREE.PerspectiveCamera(29, 1, .1, 100);
      camera.position.set(0, 4.15, 12.8);
      camera.lookAt(0, 1.4, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      host.appendChild(renderer.domElement);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .56, .36, .7);
      composer.addPass(bloom);

      const device = new THREE.Group();
      device.rotation.x = -.035;
      scene.add(device);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const metalRoom = new RoomEnvironment();
      const metalEnvironment = pmremGenerator.fromScene(metalRoom, .04).texture;
      pmremGenerator.dispose();
      metalRoom.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });

      const brushedTextures = createBrushedMetalTextures();
      const boardTextures = createPhenolicBoardTextures();
      const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      [...Object.values(brushedTextures), ...Object.values(boardTextures)].forEach((texture) => {
        texture.anisotropy = anisotropy;
      });
      const brushedMetalMaps = {
        map: brushedTextures.colorMap,
        roughnessMap: brushedTextures.roughnessMap,
        bumpMap: brushedTextures.bumpMap,
        bumpScale: .007,
        envMap: metalEnvironment,
      };
      const housingMetal = new THREE.MeshStandardMaterial({
        ...brushedMetalMaps,
        color: 0x8c8f8a,
        metalness: .7,
        roughness: .64,
        envMapIntensity: .54,
      });
      const upperFrontMetal = new THREE.MeshStandardMaterial({
        ...brushedMetalMaps,
        color: 0xa3a6a1,
        metalness: .76,
        roughness: .58,
        envMapIntensity: .64,
      });
      const lowerFrontMetal = new THREE.MeshStandardMaterial({
        ...brushedMetalMaps,
        color: 0x737671,
        metalness: .72,
        roughness: .68,
        envMapIntensity: .54,
      });
      const recessedMetal = new THREE.MeshStandardMaterial({ color: 0x080908, metalness: .15, roughness: .88 });
      const rubberMaterial = new THREE.MeshStandardMaterial({ color: 0x11120f, metalness: .02, roughness: .94 });

      const upperHousing = new THREE.Mesh(new RoundedBoxGeometry(11.92, .74, 3.42, 2, .014), housingMetal);
      upperHousing.position.set(0, .41, 0);
      upperHousing.rotation.z = .0012;
      upperHousing.castShadow = true;
      upperHousing.receiveShadow = true;
      device.add(upperHousing);

      const lowerHousing = new THREE.Mesh(new RoundedBoxGeometry(11.96, .81, 3.5, 2, .014), housingMetal);
      lowerHousing.position.set(0, -.455, .025);
      lowerHousing.rotation.z = -.001;
      lowerHousing.castShadow = true;
      lowerHousing.receiveShadow = true;
      device.add(lowerHousing);

      const upperFront = new THREE.Mesh(new RoundedBoxGeometry(11.82, .64, .055, 2, .01), upperFrontMetal);
      upperFront.position.set(0, .41, 1.755);
      upperFront.rotation.z = .0012;
      upperFront.castShadow = true;
      device.add(upperFront);

      const lowerFront = new THREE.Mesh(new RoundedBoxGeometry(11.86, .7, .055, 2, .01), lowerFrontMetal);
      lowerFront.position.set(0, -.455, 1.835);
      lowerFront.rotation.z = -.001;
      lowerFront.castShadow = true;
      device.add(lowerFront);

      const recessedSeam = new THREE.Mesh(new RoundedBoxGeometry(11.88, .065, .1, 2, .018), recessedMetal);
      recessedSeam.position.set(0, -.005, 1.66);
      recessedSeam.receiveShadow = true;
      device.add(recessedSeam);

      const rubberFootGeometry = new THREE.CylinderGeometry(.16, .18, .14, 18);
      for (const x of [-5.3, 5.3]) {
        for (const z of [-1.28, 1.28]) {
          const foot = new THREE.Mesh(rubberFootGeometry, rubberMaterial);
          foot.position.set(x, -.93, z);
          foot.castShadow = true;
          device.add(foot);
        }
      }

      const tray = new THREE.Mesh(new THREE.BoxGeometry(11.88, .035, 3.28), recessedMetal);
      tray.position.set(0, .795, 0);
      tray.receiveShadow = true;
      device.add(tray);

      const boardEdgeMaterial = new THREE.MeshStandardMaterial({
        map: boardTextures.colorMap,
        roughnessMap: boardTextures.roughnessMap,
        bumpMap: boardTextures.bumpMap,
        bumpScale: .009,
        color: 0x76502d,
        roughness: .82,
        metalness: .02,
      });
      const boardTopMaterial = new THREE.MeshStandardMaterial({
        map: boardTextures.colorMap,
        roughnessMap: boardTextures.roughnessMap,
        bumpMap: boardTextures.bumpMap,
        bumpScale: .014,
        color: 0xf0c98c,
        roughness: .78,
        metalness: .015,
      });
      const boardEdge = new THREE.Mesh(new RoundedBoxGeometry(12.18, .15, 3.5, 2, .014), boardEdgeMaterial);
      boardEdge.position.set(0, .875, .025);
      boardEdge.castShadow = true;
      boardEdge.receiveShadow = true;
      device.add(boardEdge);
      const boardTop = new THREE.Mesh(new RoundedBoxGeometry(12.16, .035, 3.48, 2, .011), boardTopMaterial);
      boardTop.position.set(0, .965, .025);
      boardTop.castShadow = true;
      boardTop.receiveShadow = true;
      device.add(boardTop);

      const holeGeometry = new THREE.CircleGeometry(.0205, 12);
      const holeMaterial = new THREE.MeshStandardMaterial({ color: 0x160e08, metalness: .04, roughness: .98 });
      const columns = 125;
      const rows = 33;
      const holes = new THREE.InstancedMesh(holeGeometry, holeMaterial, columns * rows);
      const matrix = new THREE.Matrix4();
      const holeRotation = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      const holeTranslation = new THREE.Matrix4();
      let holeIndex = 0;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          holeTranslation.makeTranslation(
            -5.84 + column * (11.68 / (columns - 1)),
            .984,
            -1.5 + row * (3 / (rows - 1)) + .025,
          );
          matrix.multiplyMatrices(holeTranslation, holeRotation);
          holes.setMatrixAt(holeIndex, matrix);
          holeIndex += 1;
        }
      }
      holes.instanceMatrix.needsUpdate = true;
      holes.receiveShadow = true;
      device.add(holes);

      const boardWasherGeometry = new THREE.CylinderGeometry(.11, .11, .025, 20);
      const boardScrewGeometry = new THREE.CylinderGeometry(.065, .065, .035, 20);
      const boardScrewMaterial = new THREE.MeshStandardMaterial({
        color: 0x777872,
        metalness: .76,
        roughness: .4,
        envMap: metalEnvironment,
        envMapIntensity: .58,
      });
      for (const [x, z] of [[-5.7, -1.495], [-5.7, 1.545], [5.7, -1.495], [5.7, 1.545]]) {
        const washer = new THREE.Mesh(boardWasherGeometry, recessedMetal);
        washer.position.set(x, .992, z);
        device.add(washer);
        const screw = new THREE.Mesh(boardScrewGeometry, boardScrewMaterial);
        screw.position.set(x, 1.016, z);
        screw.castShadow = true;
        device.add(screw);
      }

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe4e9e4,
        roughness: .045,
        metalness: 0,
        transmission: .82,
        transparent: true,
        opacity: .24,
        thickness: .09,
        ior: 1.46,
        clearcoat: 1,
        clearcoatRoughness: .05,
        emissive: 0x111614,
        emissiveIntensity: .12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const socketMaterial = new THREE.MeshStandardMaterial({
        color: 0xa4a49e,
        metalness: .22,
        roughness: .67,
        envMap: metalEnvironment,
        envMapIntensity: .38,
      });
      const socketLipMaterial = new THREE.MeshStandardMaterial({
        color: 0xb8b7b0,
        metalness: .28,
        roughness: .58,
        envMap: metalEnvironment,
        envMapIntensity: .46,
      });
      const socketInsertMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1c1a, metalness: .16, roughness: .7 });
      const pinFanMaterial = new THREE.MeshStandardMaterial({ color: 0x39362f, metalness: .58, roughness: .42 });
      const getterMaterial = new THREE.MeshStandardMaterial({ color: 0x252520, metalness: .72, roughness: .28 });
      const wireMaterial = new THREE.LineBasicMaterial({ color: 0xaaa293, transparent: true, opacity: .34 });
      const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x81745b, metalness: .5, roughness: .45 });
      const planeGeometry = new THREE.PlaneGeometry(1.22, 1.66);
      const glowPlaneGeometry = new THREE.PlaneGeometry(1.26, 1.72);
      const inactiveCathodeMaterial = new THREE.MeshBasicMaterial({
        map: createInactiveCathodeTexture(),
        color: 0x8a735a,
        transparent: true,
        opacity: .42,
        depthWrite: false,
      });
      const glassProfile = [
        new THREE.Vector2(.3, 0),
        new THREE.Vector2(.37, .05),
        new THREE.Vector2(.405, .13),
        new THREE.Vector2(.415, .18),
        new THREE.Vector2(.415, 1.7),
        new THREE.Vector2(.412, 1.76),
        new THREE.Vector2(.397, 1.83),
        new THREE.Vector2(.365, 1.9),
        new THREE.Vector2(.315, 1.96),
        new THREE.Vector2(.255, 2.02),
        new THREE.Vector2(.19, 2.07),
        new THREE.Vector2(.13, 2.11),
        new THREE.Vector2(.105, 2.135),
        new THREE.Vector2(.097, 2.16),
        new THREE.Vector2(.096, 2.195),
        new THREE.Vector2(.096, 2.235),
        new THREE.Vector2(.091, 2.255),
        new THREE.Vector2(.076, 2.274),
        new THREE.Vector2(.055, 2.287),
        new THREE.Vector2(.029, 2.296),
        new THREE.Vector2(0, 2.299),
      ];
      const glassGeometry = new THREE.LatheGeometry(glassProfile, 48);
      const cagePoints: THREE.Vector3[] = [];
      const cageStrands = 10;
      const cageSteps = 64;
      const cageTurns = 3.5;
      for (const direction of [-1, 1]) {
        for (let strand = 0; strand < cageStrands; strand += 1) {
          const phase = (strand / cageStrands) * Math.PI * 2;
          for (let step = 0; step < cageSteps; step += 1) {
            for (const pointIndex of [step, step + 1]) {
              const progress = pointIndex / cageSteps;
              const angle = phase + direction * progress * cageTurns * Math.PI * 2;
              cagePoints.push(new THREE.Vector3(
                Math.cos(angle) * .33,
                -.75 + progress * 1.5,
                Math.sin(angle) * .33,
              ));
            }
          }
        }
      }
      const cageGeometry = new THREE.BufferGeometry().setFromPoints(cagePoints);
      const tubeX = [-4.9, -3.5, -2.1, -.7, .7, 2.1, 3.5, 4.9];
      const digitSurfaces: DigitSurface[] = [];
      const digitTextures: THREE.Texture[] = [];

      tubeX.forEach((x, index) => {
        const tube = new THREE.Group();
        tube.position.set(x, .45, 0);
        device.add(tube);

        const socketFlange = new THREE.Mesh(new THREE.CylinderGeometry(.49, .49, .105, 48), socketMaterial);
        socketFlange.position.y = .59;
        socketFlange.castShadow = true;
        socketFlange.receiveShadow = true;
        tube.add(socketFlange);

        const socket = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .235, 48), socketMaterial);
        socket.position.y = .715;
        socket.castShadow = true;
        socket.receiveShadow = true;
        tube.add(socket);

        const socketInsert = new THREE.Mesh(new THREE.CylinderGeometry(.31, .32, .048, 40), socketInsertMaterial);
        socketInsert.position.y = .842;
        socketInsert.castShadow = true;
        tube.add(socketInsert);

        const collar = new THREE.Mesh(new THREE.TorusGeometry(.405, .034, 10, 48), socketLipMaterial);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = .85;
        collar.castShadow = true;
        tube.add(collar);

        const contactGeometry = new THREE.BoxGeometry(.052, .025, .115);
        for (let contactIndex = 0; contactIndex < 12; contactIndex += 1) {
          const angle = (contactIndex / 12) * Math.PI * 2;
          const contact = new THREE.Mesh(contactGeometry, socketLipMaterial);
          contact.position.set(Math.cos(angle) * .335, .873, Math.sin(angle) * .335);
          contact.rotation.y = -angle;
          contact.castShadow = true;
          tube.add(contact);
        }

        const supportPuck = new THREE.Mesh(new THREE.CylinderGeometry(.27, .28, .115, 36), socketInsertMaterial);
        supportPuck.position.y = 1.03;
        supportPuck.castShadow = true;
        tube.add(supportPuck);

        for (let pinIndex = 0; pinIndex < 12; pinIndex += 1) {
          const angle = (pinIndex / 12) * Math.PI * 2;
          const pinCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(angle) * .295, .84, Math.sin(angle) * .295),
            new THREE.Vector3(Math.cos(angle) * .245, .99, Math.sin(angle) * .245),
            new THREE.Vector3(Math.cos(angle) * .16, 1.17, Math.sin(angle) * .16),
          ]);
          const pinFan = new THREE.Mesh(new THREE.TubeGeometry(pinCurve, 5, .011, 5, false), pinFanMaterial);
          pinFan.castShadow = true;
          tube.add(pinFan);
        }

        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.y = .84;
        glass.castShadow = true;
        glass.renderOrder = 4;
        tube.add(glass);

        const getter = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .035, 24), getterMaterial);
        getter.position.y = 2.55;
        getter.castShadow = true;
        tube.add(getter);

        const cage = new THREE.LineSegments(cageGeometry, wireMaterial);
        cage.position.y = 1.68;
        tube.add(cage);

        for (const offset of [-.12, .12]) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.55, 6), stemMaterial);
          stem.position.set(offset, 1.45, -.08);
          tube.add(stem);
        }

        const inactiveCathodes = new THREE.Mesh(planeGeometry, inactiveCathodeMaterial);
        inactiveCathodes.position.set(0, 1.7, .08);
        inactiveCathodes.renderOrder = 1;
        tube.add(inactiveCathodes);

        const texture = createDigitTexture(charsRef.current[index] ?? "0");
        const coreMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: new THREE.Color(1.55, .92, .34),
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const glowMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0xff430a,
          transparent: true,
          opacity: .15,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const glowDigit = new THREE.Mesh(glowPlaneGeometry, glowMaterial);
        glowDigit.position.set(0, 1.7, .11);
        glowDigit.renderOrder = 2;
        tube.add(glowDigit);

        const digit = new THREE.Mesh(planeGeometry, coreMaterial);
        digit.position.set(0, 1.7, .14);
        digit.renderOrder = 3;
        tube.add(digit);

        digitSurfaces.push({ core: coreMaterial, glow: glowMaterial });
        digitTextures.push(texture);
      });

      digitSurfacesRef.current = digitSurfaces;
      digitTexturesRef.current = digitTextures;
      digitCharsRef.current = charsRef.current.slice(0, 8);

      const componentMetal = new THREE.MeshStandardMaterial({
        color: 0xa79e87,
        metalness: .82,
        roughness: .31,
        envMap: metalEnvironment,
        envMapIntensity: .72,
      });
      const copperPadMaterial = new THREE.MeshStandardMaterial({ color: 0x9a5b24, metalness: .72, roughness: .42 });
      const blackBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x121412,
        metalness: .08,
        roughness: .43,
        envMap: metalEnvironment,
        envMapIntensity: .34,
      });
      const blackTopMaterial = new THREE.MeshStandardMaterial({ color: 0x182027, metalness: .18, roughness: .34 });
      const capacitorSleeveMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x101312,
        metalness: 0,
        roughness: .79,
        clearcoat: .03,
        clearcoatRoughness: .9,
        envMap: metalEnvironment,
        envMapIntensity: .14,
      });
      const capacitorTopMaterial = new THREE.MeshStandardMaterial({
        color: 0x172331,
        metalness: .08,
        roughness: .7,
        envMap: metalEnvironment,
        envMapIntensity: .18,
      });
      const capacitorRollMaterial = new THREE.MeshStandardMaterial({
        color: 0x0d1111,
        metalness: .08,
        roughness: .56,
        envMap: metalEnvironment,
        envMapIntensity: .24,
      });
      const transistorMaterial = new THREE.MeshStandardMaterial({ color: 0x171816, metalness: .1, roughness: .5 });
      const yellowResistorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd0a400,
        metalness: 0,
        roughness: .52,
        clearcoat: .12,
        clearcoatRoughness: .54,
        envMap: metalEnvironment,
        envMapIntensity: .18,
      });
      const greenResistorMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8b3e, metalness: .04, roughness: .56 });
      const greenLeadMaterial = new THREE.MeshStandardMaterial({ color: 0x10110f, metalness: .18, roughness: .72 });
      const bandMaterial = new THREE.MeshStandardMaterial({ color: 0x282016, metalness: .12, roughness: .5 });
      const bluePotMaterial = new THREE.MeshStandardMaterial({
        color: 0x0868cf,
        metalness: 0,
        roughness: .58,
        envMap: metalEnvironment,
        envMapIntensity: .16,
      });
      const whiteSleeveMaterial = new THREE.MeshStandardMaterial({ color: 0xe0ddd4, metalness: 0, roughness: .8 });
      const leadGeometry = new THREE.CylinderGeometry(.006, .006, 1, 8);
      const padGeometry = new THREE.TorusGeometry(.026, .006, 6, 14);

      const addLead = (
        x: number,
        z: number,
        height: number,
        centerY: number,
        material: THREE.Material = componentMetal,
      ) => {
        const lead = new THREE.Mesh(leadGeometry, material);
        lead.scale.y = height;
        lead.position.set(x, centerY, z);
        lead.castShadow = true;
        device.add(lead);
        const pad = new THREE.Mesh(padGeometry, copperPadMaterial);
        pad.rotation.x = Math.PI / 2;
        pad.position.set(x, .993, z);
        device.add(pad);
      };

      // Large blue trimmer and the diagonally mounted electrolytic capacitor at the left edge.
      const bluePot = new THREE.Group();
      bluePot.position.set(-5.3, .985, 1.1);
      bluePot.rotation.y = -.08;
      const bluePotProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(.25, 0),
        new THREE.Vector2(.276, .018),
        new THREE.Vector2(.282, .068),
        new THREE.Vector2(.274, .082),
        new THREE.Vector2(.272, .135),
        new THREE.Vector2(.264, .152),
        new THREE.Vector2(.252, .168),
        new THREE.Vector2(.247, .215),
        new THREE.Vector2(.216, .242),
        new THREE.Vector2(0, .245),
      ];
      const bluePotBody = new THREE.Mesh(new THREE.LatheGeometry(bluePotProfile, 48), bluePotMaterial);
      bluePotBody.castShadow = true;
      bluePot.add(bluePotBody);
      for (const [y, radius] of [[.076, .272], [.157, .256]] as const) {
        const bluePotGroove = new THREE.Mesh(new THREE.TorusGeometry(radius, .006, 6, 40), blackTopMaterial);
        bluePotGroove.rotation.x = Math.PI / 2;
        bluePotGroove.position.y = y;
        bluePot.add(bluePotGroove);
      }
      const bluePotTop = new THREE.Mesh(new THREE.CylinderGeometry(.18, .19, .02, 40), blackTopMaterial);
      bluePotTop.position.y = .248;
      bluePotTop.castShadow = true;
      bluePot.add(bluePotTop);
      const bluePotMarker = new THREE.Mesh(
        new THREE.CylinderGeometry(.254, .284, .205, 24, 1, true, .35, .82),
        whiteSleeveMaterial,
      );
      bluePotMarker.position.y = .112;
      bluePotMarker.castShadow = true;
      bluePot.add(bluePotMarker);
      device.add(bluePot);

      const lyingCapacitor = new THREE.Group();
      lyingCapacitor.position.set(-4.77, 1.12, 1.18);
      lyingCapacitor.rotation.y = 1.36;
      const lyingBodyProfile = [
        new THREE.Vector2(0, -.34),
        new THREE.Vector2(.115, -.34),
        new THREE.Vector2(.129, -.326),
        new THREE.Vector2(.135, -.302),
        new THREE.Vector2(.135, .302),
        new THREE.Vector2(.129, .326),
        new THREE.Vector2(.115, .34),
        new THREE.Vector2(0, .34),
      ];
      const lyingBody = new THREE.Mesh(new THREE.LatheGeometry(lyingBodyProfile, 48), capacitorSleeveMaterial);
      lyingBody.rotation.z = Math.PI / 2;
      lyingBody.castShadow = true;
      lyingCapacitor.add(lyingBody);
      const lyingPolarityStripe = new THREE.Mesh(
        new THREE.CylinderGeometry(.1365, .1365, .56, 24, 1, true, -.35, .7),
        whiteSleeveMaterial,
      );
      lyingPolarityStripe.rotation.z = Math.PI / 2;
      lyingPolarityStripe.castShadow = true;
      lyingCapacitor.add(lyingPolarityStripe);
      for (const x of [-.35, .35]) {
        const end = new THREE.Mesh(new THREE.CylinderGeometry(.116, .12, .012, 40), capacitorRollMaterial);
        end.rotation.z = Math.PI / 2;
        end.position.x = x;
        end.castShadow = true;
        lyingCapacitor.add(end);
      }
      for (const x of [-.338, .338]) {
        const lyingEndRoll = new THREE.Mesh(new THREE.TorusGeometry(.122, .004, 6, 40), capacitorRollMaterial);
        lyingEndRoll.rotation.y = Math.PI / 2;
        lyingEndRoll.position.x = x;
        lyingCapacitor.add(lyingEndRoll);
      }
      device.add(lyingCapacitor);

      // Two upright packages between the left controls and the tube bank.
      for (const x of [-2.1, -1.1]) {
        const transistor = new THREE.Mesh(new RoundedBoxGeometry(.32, .43, .22, 3, .065), transistorMaterial);
        transistor.position.set(x, 1.225, 1.08);
        transistor.castShadow = true;
        device.add(transistor);
        for (const leadOffset of [-.08, 0, .08]) addLead(x + leadOffset, 1.08, .18, 1.07);
      }

      // Eight detailed electrolytic capacitors and the matching compact resistor row.
      for (let index = 0; index < 8; index += 1) {
        const x = 2.12 + index * .3;
        const capacitorHeight = .5 + deterministicNoise(index * 2.7 + 4) * .012;
        const bodyBottom = 1.035;
        const capacitor = new THREE.Group();
        capacitor.position.set(x, bodyBottom, .91);
        capacitor.rotation.z = (deterministicNoise(index * 3.9 + 2) - .5) * .01;
        capacitor.rotation.x = (deterministicNoise(index * 4.7 + 3) - .5) * .006;
        device.add(capacitor);

        const bodyProfile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(.112, 0),
          new THREE.Vector2(.12, .012),
          new THREE.Vector2(.124, .028),
          new THREE.Vector2(.124, capacitorHeight - .026),
          new THREE.Vector2(.12, capacitorHeight - .012),
          new THREE.Vector2(.108, capacitorHeight),
          new THREE.Vector2(0, capacitorHeight),
        ];
        const capacitorBody = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 48), capacitorSleeveMaterial);
        capacitorBody.castShadow = true;
        capacitor.add(capacitorBody);

        const bottomBung = new THREE.Mesh(new THREE.CylinderGeometry(.105, .11, .012, 40), capacitorRollMaterial);
        bottomBung.position.y = -.003;
        bottomBung.castShadow = true;
        capacitor.add(bottomBung);

        const rolledEdge = new THREE.Mesh(new THREE.TorusGeometry(.117, .004, 6, 40), capacitorRollMaterial);
        rolledEdge.rotation.x = Math.PI / 2;
        rolledEdge.position.y = capacitorHeight - .018;
        rolledEdge.castShadow = true;
        capacitor.add(rolledEdge);

        const capacitorTop = new THREE.Mesh(new THREE.CylinderGeometry(.106, .109, .01, 48), capacitorTopMaterial);
        capacitorTop.position.y = capacitorHeight - .004;
        capacitorTop.castShadow = true;
        capacitor.add(capacitorTop);

        const stripeHeight = capacitorHeight - .15;
        const sideStripe = new THREE.Mesh(
          new THREE.CylinderGeometry(.1255, .1255, stripeHeight, 6, 1, true, 1.29, .12),
          whiteSleeveMaterial,
        );
        sideStripe.position.y = .075 + stripeHeight / 2;
        capacitor.add(sideStripe);
        const shoulderStripe = new THREE.Mesh(
          new THREE.CylinderGeometry(.1255, .1255, .055, 12, 1, true, .62, .65),
          whiteSleeveMaterial,
        );
        shoulderStripe.position.y = capacitorHeight - .052;
        capacitor.add(shoulderStripe);

        for (const leadOffset of [-.037, .037]) {
          const capacitorLead = new THREE.Mesh(leadGeometry, capacitorRollMaterial);
          capacitorLead.scale.y = .055;
          capacitorLead.position.set(leadOffset, -.018, 0);
          capacitor.add(capacitorLead);
        }

        const resistorZ = 1.35;
        addLead(x, resistorZ, .03, 1.006, bandMaterial);
        const resistorProfile = [
          new THREE.Vector2(0, -.115),
          new THREE.Vector2(.014, -.113),
          new THREE.Vector2(.026, -.102),
          new THREE.Vector2(.032, -.082),
          new THREE.Vector2(.03, -.054),
          new THREE.Vector2(.024, -.04),
          new THREE.Vector2(.024, .012),
          new THREE.Vector2(.035, .022),
          new THREE.Vector2(.047, .04),
          new THREE.Vector2(.052, .062),
          new THREE.Vector2(.051, .082),
          new THREE.Vector2(.043, .101),
          new THREE.Vector2(.026, .112),
          new THREE.Vector2(.006, .116),
          new THREE.Vector2(0, .116),
        ];
        const resistorBody = new THREE.Mesh(new THREE.LatheGeometry(resistorProfile, 36), yellowResistorMaterial);
        resistorBody.position.set(x, 1.145, resistorZ);
        resistorBody.castShadow = true;
        device.add(resistorBody);
        for (const offset of [-.032, -.018, -.004, .01]) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(.0255, .0034, 8, 24), bandMaterial);
          band.rotation.x = Math.PI / 2;
          band.position.set(x, 1.145 + offset, resistorZ);
          device.add(band);
        }
      }

      // Two compact banks of green axial resistors at the far right.
      const greenBodyGeometry = new THREE.CylinderGeometry(.046, .046, .31, 18);
      const greenLeadGeometry = new THREE.CylinderGeometry(.008, .008, .18, 6);
      for (let bank = 0; bank < 2; bank += 1) {
        for (let row = 0; row < 5; row += 1) {
          const x = 4.98 + bank * .5;
          const z = .86 + row * .15;
          const body = new THREE.Mesh(greenBodyGeometry, greenResistorMaterial);
          body.rotation.z = Math.PI / 2;
          body.position.set(x, 1.12, z);
          body.castShadow = true;
          device.add(body);
          for (const bandOffset of [-.07, .07]) {
            const band = new THREE.Mesh(new THREE.TorusGeometry(.053, .007, 6, 16), bandMaterial);
            band.rotation.y = Math.PI / 2;
            band.position.set(x + bandOffset, 1.12, z);
            device.add(band);
          }
          for (const leadOffset of [-.23, .23]) {
            const lead = new THREE.Mesh(greenLeadGeometry, greenLeadMaterial);
            lead.rotation.z = Math.PI / 2;
            lead.position.set(x + leadOffset, 1.12, z);
            lead.castShadow = true;
            device.add(lead);
          }
          for (const footOffset of [-.32, .32]) addLead(x + footOffset, z, .13, 1.055, greenLeadMaterial);
        }
      }

      const rightPackage = new THREE.Mesh(new RoundedBoxGeometry(.27, .4, .2, 3, .06), transistorMaterial);
      rightPackage.position.set(5.78, 1.21, 1.02);
      rightPackage.castShadow = true;
      device.add(rightPackage);
      for (const leadOffset of [-.07, 0, .07]) {
        addLead(5.78 + leadOffset, 1.02, .17, 1.065, greenLeadMaterial);
      }

      const clippedLeftPackage = new THREE.Mesh(new RoundedBoxGeometry(.28, .12, .24, 2, .03), blackBodyMaterial);
      clippedLeftPackage.position.set(-5.98, 1.055, 1.34);
      clippedLeftPackage.castShadow = true;
      device.add(clippedLeftPackage);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 28),
        new THREE.MeshStandardMaterial({ color: 0x090a09, metalness: .17, roughness: .83 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.02;
      floor.receiveShadow = true;
      scene.add(floor);

      const hemi = new THREE.HemisphereLight(0x87918d, 0x160a05, .33);
      scene.add(hemi);

      const frontFill = new THREE.DirectionalLight(0xb4bbb4, .52);
      frontFill.position.set(0, 2.5, 8);
      scene.add(frontFill);

      const keyLight = new THREE.SpotLight(0xffe4c6, 41, 28, .62, .88, 1.55);
      keyLight.position.set(-4.5, 7.6, 7.5);
      keyLight.target.position.set(0, 1.35, 0);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.bias = -.0002;
      keyLight.shadow.normalBias = .018;
      keyLight.shadow.radius = 4;
      scene.add(keyLight, keyLight.target);

      const rimLight = new THREE.SpotLight(0x6f91a6, 8, 20, .68, .9, 2);
      rimLight.position.set(5, 4.5, -5);
      rimLight.target.position.set(0, 1.55, 0);
      scene.add(rimLight, rimLight.target);

      const tubeLightLeft = new THREE.PointLight(0xff4b0a, 4, 3, 2);
      tubeLightLeft.position.set(-3, 2.55, 1.1);
      scene.add(tubeLightLeft);
      const tubeLightRight = new THREE.PointLight(0xff4b0a, 4, 3, 2);
      tubeLightRight.position.set(3, 2.55, 1.1);
      scene.add(tubeLightRight);

      const onPointerMove = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      };
      const onPointerLeave = () => pointer.set(0, 0);
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);

      const resize = () => {
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
        camera.aspect = width / height;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const distanceForWidth = (12.8 / 2) / Math.tan(horizontalFov / 2);
        const distanceForHeight = (5.6 / 2) / Math.tan(verticalFov / 2);
        const distance = Math.max(distanceForWidth, distanceForHeight);
        camera.position.set(0, 1.4 + distance * .25, distance);
        camera.lookAt(0, 1.4, 0);
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        const elapsed = clock.getElapsedTime();
        const motionScale = reduceMotion.matches ? 0 : 1;
        device.rotation.y += (pointer.x * .045 * motionScale - device.rotation.y) * .055;
        device.rotation.x += ((-.035 + pointer.y * .018 * motionScale) - device.rotation.x) * .055;
        device.position.y = 0;

        const flicker = scanningRef.current ? .62 + Math.random() * .5 : .96 + Math.sin(elapsed * 9) * .025;
        digitSurfaces.forEach(({ core, glow }) => {
          core.opacity = flicker;
          glow.opacity = scanningRef.current ? .22 + Math.random() * .16 : .15;
        });
        tubeLightLeft.intensity = (scanningRef.current ? 4.8 + Math.random() * 2.1 : 4) * flicker;
        tubeLightRight.intensity = (scanningRef.current ? 4.8 + Math.random() * 2.1 : 4) * flicker;

        composer.render();
        animationFrame = window.requestAnimationFrame(animate);
      };
      animate();

      const cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
        digitTexturesRef.current.forEach((texture) => texture.dispose());
        digitTexturesRef.current = [];
        digitCharsRef.current = [];
        digitSurfacesRef.current = [];
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(disposeMaterial);
          }
        });
        metalEnvironment.dispose();
        keyLight.shadow.dispose();
        bloom.dispose();
        composer.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };

      if (disposed) cleanup();
      else cleanupRef.current = cleanup;
    };

    const cleanupRef = { current: null as null | (() => void) };
    void start();

    return () => {
      disposed = true;
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div className="divergence-scene" ref={hostRef} aria-hidden="true">
      <div className="scene-loading">{loadingLabel}</div>
    </div>
  );
}
