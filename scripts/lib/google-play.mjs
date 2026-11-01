import { createSign } from "node:crypto";

const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD_ROOT = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";

export function parseServiceAccount(value = process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  if (!value) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY.");
  const candidates = [value, value.replaceAll("\\n", "\n"), Buffer.from(value, "base64").toString("utf8")];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replaceAll("\\n", "\n"),
          projectId: parsed.project_id ?? "(unknown project)",
          tokenUri: DEFAULT_TOKEN_URI,
        };
      }
    } catch {
      // Try supported encodings without logging credential values.
    }
  }
  throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid service account JSON.");
}

async function fetchJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { throw new Error(`Google API returned non-JSON (${response.status}).`); }
  }
  if (!response.ok) {
    throw new Error(`Google API ${response.status}: ${body.error?.message ?? body.error_description ?? response.statusText}`);
  }
  return body;
}

export async function getAccessToken(serviceAccount, { fetchImpl = fetch } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: serviceAccount.clientEmail,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: DEFAULT_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  })}`;
  const assertion = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.privateKey, "base64url")}`;
  const body = await fetchJson(fetchImpl, DEFAULT_TOKEN_URI, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!body.access_token) throw new Error("OAuth token response did not include access_token.");
  return body.access_token;
}

export function createPlayClient({ accessToken, fetchImpl = fetch, packageName = "com.newsonafrica.app" }) {
  if (!accessToken) throw new Error("An access token is required.");
  const packagePath = `/applications/${encodeURIComponent(packageName)}`;
  const request = (path, options = {}) => {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Expected package-relative API path.");
    return fetchJson(fetchImpl, `${API_ROOT}${packagePath}${path}`, {
      ...options,
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...options.headers },
    });
  };
  const upload = (path, body, contentType = "image/png") => {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Expected package-relative upload path.");
    return fetchJson(fetchImpl, `${UPLOAD_ROOT}${packagePath}${path}?uploadType=media`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": contentType },
      body,
    });
  };
  return { request, upload };
}
