/**
 * PWA icon generator (NOA-109).
 *
 * Renders the brand SVG sources in `public/icons/` to the PNG sizes required
 * for installability (manifest icons, maskable icons, Apple touch icon).
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 *
 * `sharp` is not a direct dependency — it ships transitively with Next.js —
 * so it is resolved through Next's own dependency tree. If a future Next
 * upgrade drops sharp, add it to devDependencies and simplify the import.
 */

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");

/** [source SVG, output PNG, size, flatten background?] */
const targets = [
  // "any" purpose icons — rounded tile with transparent corners.
  ["icon.svg", "icon-192.png", 192, false],
  ["icon.svg", "icon-512.png", 512, false],
  // "maskable" purpose icons — full-bleed, monogram inside the safe zone.
  ["icon-maskable.svg", "icon-maskable-192.png", 192, false],
  ["icon-maskable.svg", "icon-maskable-512.png", 512, false],
  // Apple touch icon — iOS applies its own mask, so use the full-bleed
  // variant and flatten (no alpha channel) per Apple guidance.
  ["icon-maskable.svg", "apple-touch-icon.png", 180, true],
];

for (const [source, output, size, flatten] of targets) {
  const svg = await readFile(path.join(iconsDir, source));
  let pipeline = sharp(svg, { density: 300 }).resize(size, size);
  if (flatten) {
    pipeline = pipeline.flatten({ background: "#16a34a" });
  }
  await pipeline.png().toFile(path.join(iconsDir, output));
  console.log(`generated public/icons/${output} (${size}x${size})`);
}
