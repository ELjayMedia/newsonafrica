#!/usr/bin/env node

import { createSign } from "node:crypto";

const PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME ?? "com.newsonafrica.app";
const SERVICE_ACCOUNT_ENV = "GOOGLE_SERVICE_ACCOUNT_KEY";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function parseServiceAccount() {
  const value = process.env[SERVICE_ACCOUNT_ENV];

  if (!value) {
    throw new Error(`Missing ${SERVICE_ACCOUNT_ENV}.`);
  }

  const candidates = [
    value,
    value.replaceAll("\\n", "\n"),
    Buffer.from(value, "base64").toString("utf8"),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replaceAll("\\n", "\n"),
          projectId: parsed.project_id ?? "(unknown project)",
          tokenUri: parsed.token_uri ?? DEFAULT_TOKEN_URI,
        };
      }
    } catch {
      // Keep trying supported encodings without leaking the secret value.
    }
  }

  throw new Error(`${SERVICE_ACCOUNT_ENV} is not valid service account JSON.`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!response.ok) {
    const message = body.error?.message ?? body.error_description ?? response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return body;
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    iss: serviceAccount.clientEmail,
    scope: SCOPE,
    aud: serviceAccount.tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claimSet),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsignedJwt).sign(serviceAccount.privateKey);
  const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;
  const token = await fetchJson(serviceAccount.tokenUri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!token.access_token) {
    throw new Error("OAuth token response did not include access_token.");
  }

  return token.access_token;
}

async function playRequest(path, accessToken, options = {}) {
  return fetchJson(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

async function main() {
  const serviceAccount = parseServiceAccount();

  console.log(`Checking Google Play access for ${PACKAGE_NAME}`);
  console.log(`Service account: ${serviceAccount.clientEmail}`);
  console.log(`Project: ${serviceAccount.projectId}`);

  const accessToken = await getAccessToken(serviceAccount);
  let editId;

  try {
    const edit = await playRequest(`/applications/${PACKAGE_NAME}/edits`, accessToken, {
      method: "POST",
      body: "{}",
    });
    editId = edit.id;

    if (!editId) {
      throw new Error("Play edit response did not include an edit id.");
    }

    console.log(`Temporary edit created: ${editId}`);

    const bundles = await playRequest(
      `/applications/${PACKAGE_NAME}/edits/${editId}/bundles`,
      accessToken,
    );
    const bundleCount = bundles.bundles?.length ?? 0;

    console.log(`Bundle list readable: ${bundleCount} bundle(s) visible in this edit.`);
  } finally {
    if (editId) {
      await playRequest(`/applications/${PACKAGE_NAME}/edits/${editId}`, accessToken, {
        method: "DELETE",
      });
      console.log("Temporary edit deleted.");
    }
  }

  console.log("Google Play API access verified.");
}

main().catch((error) => {
  console.error(`Google Play API access check failed: ${error.message}`);
  process.exitCode = 1;
});
