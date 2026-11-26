/**
 * PWA icon generator (NOA-109).
 *
 * Renders the brand SVG sources in `public/icons/` to the PNG sizes required
 * for installability (manifest icons, maskable icons, Apple touch icon), plus
 * the multi-size `public/favicon.ico` that browsers, Safari tabs and search
 * engines request at the site root, and the Android (TWA) launcher, splash,
 * shortcut and notification PNGs under `android/app/src/main/res/`.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 *
 * `sharp` is not a direct dependency — it ships transitively with Next.js —
 * so it is resolved through Next's own dependency tree. If a future Next
 * upgrade drops sharp, add it to devDependencies and simplify the import.
 */

import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
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
    pipeline = pipeline.flatten({ background: "#15994a" });
  }
  await pipeline.png().toFile(path.join(iconsDir, output));
  console.log(`generated public/icons/${output} (${size}x${size})`);
}

// favicon.ico — 16/32/48 px PNG frames in one ICO container (PNG-in-ICO is
// supported by every current browser). Built by hand so no extra dependency
// is needed: 6-byte ICONDIR header, one 16-byte ICONDIRENTRY per frame, then
// the PNG payloads.
const faviconSizes = [16, 32, 48];
const faviconSvg = await readFile(path.join(iconsDir, "icon.svg"));
const frames = await Promise.all(
  faviconSizes.map((size) =>
    sharp(faviconSvg, { density: 300 }).resize(size, size).png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + 16 * i;
  const size = faviconSizes[i];
  header.writeUInt8(size, entry); // width
  header.writeUInt8(size, entry + 1); // height
  header.writeUInt8(0, entry + 2); // palette colours
  header.writeUInt8(0, entry + 3); // reserved
  header.writeUInt16LE(1, entry + 4); // colour planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(path.join(root, "public", "favicon.ico"), Buffer.concat([header, ...frames]));
console.log(`generated public/favicon.ico (${faviconSizes.join("/")})`);

// Android (TWA) resources — same sources, at each density bubblewrap emits.
const resDir = path.join(root, "android", "app", "src", "main", "res");
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
/** [source SVG, res folder prefix, file, size at mdpi] */
const androidTargets = [
  ["icon.svg", "mipmap", "ic_launcher.png", 48],
  ["icon-maskable.svg", "mipmap", "ic_maskable.png", 82],
  ["icon.svg", "drawable", "splash.png", 300],
  ["icon.svg", "drawable", "shortcut_0.png", 48],
  ["icon.svg", "drawable", "shortcut_1.png", 48],
  ["notification.svg", "drawable", "ic_notification_icon.png", 24],
];
for (const [source, kind, file, base] of androidTargets) {
  const svg = await readFile(path.join(iconsDir, source));
  for (const [density, scale] of Object.entries(densities)) {
    const size = Math.round(base * scale);
    const out = path.join(resDir, `${kind}-${density}`, file);
    await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out);
  }
  console.log(`generated android ${kind}-*/${file}`);
}
