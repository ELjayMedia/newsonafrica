/**
 * Shared SEO constants and URL helpers (NOA-79 epic).
 *
 * Client-safe: only depends on `publicEnv`. Used by robots/sitemap routes,
 * Google News sitemaps (NOA-113), JSON-LD builders (NOA-114) and OG images
 * (NOA-115) so branding and the canonical origin can't drift between them.
 */
import { publicEnv } from "@/lib/env";

export const SITE_NAME = "News on Africa";
export const SITE_DESCRIPTION = "Independent African journalism.";

/** Google News `<news:publication>` identity (NOA-113). */
export const PUBLICATION_NAME = SITE_NAME;
export const PUBLICATION_LANGUAGE = "en";

/** Canonical origin with no trailing slash (e.g. "https://newsonafrica.com"). */
export function getBaseUrl(): string {
  return publicEnv.SITE_URL.replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
