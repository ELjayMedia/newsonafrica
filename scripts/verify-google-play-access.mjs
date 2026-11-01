#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createPlayClient, getAccessToken, parseServiceAccount } from "./lib/google-play.mjs";

export function selectVersionCode(candidate, bundles, autoVersionCode = false) {
  if (!/^[1-9]\d*$/.test(String(candidate)) || Number(candidate) > 2100000000) {
    throw new Error("Version code must be an integer between 1 and 2100000000.");
  }
  const highest = Math.max(0, ...bundles.map((bundle) => Number(bundle.versionCode)).filter(Number.isFinite));
  const selected = autoVersionCode ? Math.max(Number(candidate), highest + 1) : Number(candidate);
  if (selected <= highest) {
    throw new Error(`Version code ${selected} has already been used or is below existing code ${highest}. Choose a higher version_code.`);
  }
  if (selected > 2100000000) throw new Error("No higher Play version code is available within the allowed limit.");
  return String(selected);
}

// This temporary edit is always deleted; no bundle or release is submitted.
export async function verifyPlayAccess(client, { versionCode, autoVersionCode = false } = {}) {
  let editId;
  try {
    const edit = await client.request("/edits", { method: "POST", body: "{}" });
    editId = edit.id;
    if (!editId) throw new Error("Play edit response did not include an edit id.");
    const editPath = `/edits/${encodeURIComponent(editId)}`;
    const { bundles = [] } = await client.request(`${editPath}/bundles`);
    const { apks = [] } = await client.request(`${editPath}/apks`);
    return {
      bundleCount: bundles.length,
      apkCount: apks.length,
      versionCode: versionCode === undefined ? undefined : selectVersionCode(versionCode, [...bundles, ...apks], autoVersionCode),
    };
  } finally {
    if (editId) await client.request(`/edits/${encodeURIComponent(editId)}`, { method: "DELETE" });
  }
}

async function main() {
  const packageName = process.env.PLAY_PACKAGE_NAME ?? "com.newsonafrica.app";
  const account = parseServiceAccount();
  const accessToken = await getAccessToken(account);
  const client = createPlayClient({ accessToken, packageName });
  const result = await verifyPlayAccess(client, {
    versionCode: process.env.NOA_ANDROID_VERSION_CODE,
    autoVersionCode: process.env.PLAY_AUTO_VERSION_CODE === "true",
  });
  console.log(`Checked ${packageName}; ${result.bundleCount} bundle(s) and ${result.apkCount} APK(s) visible.`);
  if (result.versionCode) {
    console.log(`Selected release version code: ${result.versionCode}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version-code=${result.versionCode}\n`);
  }
  console.log("Google Play API access verified.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Google Play API access check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
