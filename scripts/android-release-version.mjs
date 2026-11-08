#!/usr/bin/env node

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function resolveReleaseVersion(env) {
  const tagged = env.GITHUB_REF?.startsWith('refs/tags/');
  const versionName = tagged
    ? env.GITHUB_REF.slice('refs/tags/android-v'.length)
    : env.INPUT_VERSION_NAME;
  if (tagged && !env.GITHUB_REF.startsWith('refs/tags/android-v')) {
    throw new Error('Android release tags must start with android-v.');
  }
  if (!versionName || versionName.length > 50 || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(versionName)) {
    throw new Error('Use a version such as 1.0.3 or 1.0.3-rc.1 (maximum 50 characters).');
  }

  const explicitCode = env.INPUT_VERSION_CODE?.trim();
  const runNumber = env.GITHUB_RUN_NUMBER;
  if (!explicitCode && !/^[1-9]\d*$/.test(runNumber ?? '')) {
    throw new Error('A positive GITHUB_RUN_NUMBER or explicit version code is required.');
  }
  const versionCode = explicitCode || String(Number(runNumber) + 3);
  if (!/^[1-9]\d*$/.test(versionCode) || Number(versionCode) > 2100000000) {
    throw new Error('Version code must be an integer between 1 and 2100000000.');
  }
  return { versionName, versionCode };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { versionName, versionCode } = resolveReleaseVersion(process.env);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `version-name=${versionName}\nversion-code=${versionCode}\n`);
    }
    console.log(`Building Android ${versionName} (candidate version code ${versionCode}).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
