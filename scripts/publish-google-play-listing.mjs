#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createPlayClient, getAccessToken, parseServiceAccount } from "./lib/google-play.mjs";

const FIELDS = { title: 30, shortDescription: 80, fullDescription: 4000 };
const LANGUAGE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function validateListing(listing, language) {
  if (!LANGUAGE.test(language)) throw new Error(`Invalid listing language: ${language}`);
  if (!listing || typeof listing !== "object" || Array.isArray(listing)) throw new Error(`${language}: expected a listing object.`);
  const unknown = Object.keys(listing).filter((field) => !(field in FIELDS));
  if (unknown.length) throw new Error(`${language}: unknown listing fields: ${unknown.join(", ")}`);
  for (const [field, limit] of Object.entries(FIELDS)) {
    const value = listing[field];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${language}: ${field} is required.`);
    if ([...value].length > limit) throw new Error(`${language}: ${field} exceeds ${limit} characters.`);
  }
  return listing;
}

function pngDimensions(bytes, file) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature) || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${file}: expected a PNG image.`);
  }
  if (bytes[24] !== 8 || ![2, 6].includes(bytes[25])) {
    throw new Error(`${file}: use an 8-bit RGB or RGBA PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alpha: bytes[25] === 6 };
}

async function loadImage(file, type) {
  const bytes = await readFile(file);
  const dimensions = pngDimensions(bytes, file);
  const { width, height, alpha } = dimensions;
  if (type === "icon" && (width !== 512 || height !== 512)) throw new Error(`${file}: icon must be 512×512.`);
  if (type === "featureGraphic" && (width !== 1024 || height !== 500 || alpha)) {
    throw new Error(`${file}: feature graphic must be a 1024×500 RGB PNG without alpha.`);
  }
  if (type === "phoneScreenshots" && (Math.min(width, height) < 320 || Math.max(width, height) > 3840)) {
    throw new Error(`${file}: screenshot dimensions must be between 320 and 3840 pixels.`);
  }
  return { file, bytes, width, height };
}

export async function loadListingPlan(directory = resolve("play-store"), uploadGraphics = false) {
  const listingDirectory = join(directory, "listings");
  const files = (await readdir(listingDirectory)).filter((file) => file.endsWith(".json")).sort();
  if (!files.length) throw new Error("At least one listing JSON file is required.");
  const listings = [];
  for (const file of files) {
    const language = file.slice(0, -5);
    const listing = validateListing(JSON.parse(await readFile(join(listingDirectory, file), "utf8")), language);
    const graphics = {};
    if (uploadGraphics) {
      const graphicsDirectory = join(directory, "graphics", language);
      graphics.icon = [await loadImage(join(graphicsDirectory, "icon.png"), "icon")];
      graphics.featureGraphic = [await loadImage(join(graphicsDirectory, "featureGraphic.png"), "featureGraphic")];
      const screenshotsDirectory = join(graphicsDirectory, "phoneScreenshots");
      const screenshots = (await readdir(screenshotsDirectory)).filter((file) => file.endsWith(".png")).sort();
      if (screenshots.length < 2 || screenshots.length > 8) throw new Error(`${language}: provide between 2 and 8 phone screenshots.`);
      graphics.phoneScreenshots = await Promise.all(screenshots.map((file) => loadImage(join(screenshotsDirectory, file), "phoneScreenshots")));
    }
    listings.push({ language, listing, graphics });
  }
  return listings;
}

export async function publishListings({ directory = resolve("play-store"), dryRun = true, uploadGraphics = false, client, log = console.log } = {}) {
  // Finish local validation before reading credentials or creating an edit.
  const listings = await loadListingPlan(directory, uploadGraphics);
  const summary = {
    dryRun,
    packageName: "com.newsonafrica.app",
    graphics: uploadGraphics ? "replace icon, feature graphic and phone screenshots" : "preserve existing Play images",
    listings: listings.map(({ language, listing, graphics }) => ({
      language,
      ...listing,
      images: Object.fromEntries(Object.entries(graphics).map(([type, images]) => [type, images.map(({ file, width, height }) => ({ file, width, height }))])),
    })),
  };
  log(JSON.stringify(summary, null, 2));
  if (dryRun) return summary;

  client ??= createPlayClient({ accessToken: await getAccessToken(parseServiceAccount()) });
  let editId;
  let committed = false;
  try {
    const edit = await client.request("/edits", { method: "POST", body: "{}" });
    if (!edit.id) throw new Error("Play edit response did not include an edit id.");
    editId = encodeURIComponent(edit.id);
    for (const { language, listing, graphics } of listings) {
      const listingPath = `/edits/${editId}/listings/${encodeURIComponent(language)}`;
      // PATCH preserves video/other listing fields maintained in Play Console.
      await client.request(listingPath, { method: "PATCH", body: JSON.stringify(listing) });
      for (const [type, images] of Object.entries(graphics)) {
        const imagePath = `${listingPath}/${type}`;
        await client.request(imagePath, { method: "DELETE" });
        for (const { bytes } of images) await client.upload(imagePath, bytes);
      }
    }
    await client.request(`/edits/${editId}:validate`, { method: "POST", body: "{}" });
    await client.request(`/edits/${editId}:commit`, { method: "POST", body: "{}" });
    committed = true;
    log("Google Play listing edit committed. Check Play Console for review/publication status.");
    return summary;
  } finally {
    if (editId && !committed) {
      try { await client.request(`/edits/${editId}`, { method: "DELETE" }); }
      catch { log("Could not delete the uncommitted Play edit; it will expire automatically."); }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => !["--publish", "--upload-graphics"].includes(arg));
  if (unknown.length) {
    console.error(`Unknown arguments: ${unknown.join(" ")}`);
    process.exitCode = 1;
  } else {
    publishListings({ dryRun: !args.includes("--publish"), uploadGraphics: args.includes("--upload-graphics") }).catch((error) => {
      console.error(`Google Play listing failed: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
