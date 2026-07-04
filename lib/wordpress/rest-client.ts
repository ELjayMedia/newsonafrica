/**
 * Typed WordPress REST API v2 client (NOA-85).
 *
 * Wraps `fetchWithRetry` with WordPress-specific concerns: base URL
 * resolution per country, query-string building, JSON parsing, pagination
 * headers, and Next.js fetch cache config (tags/revalidate).
 */
import "server-only";

import { serverEnv } from "@/lib/env";
import { getRestBase, type CountryCode } from "@/lib/wordpress/countries";
import { fetchWithRetry, type FetchWithRetryOptions } from "@/lib/wordpress/http";
import type { WPRestListResult, WPRestPageInfo } from "@/lib/wordpress/types";

export class WordPressRestError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;
  public readonly bodySnippet?: string;

  constructor(response: Response, url: string, bodySnippet?: string) {
    super(`WordPress REST request to ${url} failed with status ${response.status}`);
    this.name = "WordPressRestError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = url;
    this.bodySnippet = bodySnippet;
  }
}

export type RestQueryValue = string | number | boolean | readonly (string | number)[] | undefined;

export interface FetchWordPressRestOptions {
  /** Query params appended to the request URL. */
  params?: Record<string, RestQueryValue>;
  /** Next.js cache tags for on-demand revalidation (NOA-88). */
  tags?: readonly string[];
  /** Seconds to cache for; 0 disables the Next.js data cache. */
  revalidate?: number;
  timeout?: number;
  signal?: AbortSignal;
  attempts?: number;
}

function buildQueryString(params?: Record<string, RestQueryValue>): string {
  if (!params) return "";
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function buildRequestInit(options: FetchWordPressRestOptions): FetchWithRetryOptions {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (serverEnv.WORDPRESS_API_AUTH_HEADER) {
    headers.Authorization = serverEnv.WORDPRESS_API_AUTH_HEADER;
  }

  const init: FetchWithRetryOptions = {
    method: "GET",
    headers,
    timeout: options.timeout ?? serverEnv.WORDPRESS_REQUEST_TIMEOUT_MS,
    signal: options.signal,
    attempts: options.attempts ?? serverEnv.WORDPRESS_RETRY_ATTEMPTS,
    backoffMs: serverEnv.WORDPRESS_RETRY_BACKOFF_MS,
  };

  const tags = options.tags && options.tags.length > 0 ? Array.from(new Set(options.tags)) : undefined;
  const revalidate = options.revalidate;

  if (revalidate !== undefined || tags) {
    init.next = {
      ...(revalidate !== undefined ? { revalidate } : {}),
      ...(tags ? { tags } : {}),
    };
  } else {
    init.cache = "no-store";
  }

  return init;
}

function parsePageInfo(response: Response): WPRestPageInfo {
  const total = Number(response.headers.get("X-WP-Total") ?? 0);
  const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? 0);
  return {
    total: Number.isFinite(total) ? total : 0,
    totalPages: Number.isFinite(totalPages) ? totalPages : 0,
  };
}

async function parseJsonOrThrow(response: Response, url: string): Promise<unknown> {
  const rawBody = await response.text();

  if (!response.ok) {
    throw new WordPressRestError(response, url, rawBody.slice(0, 512));
  }

  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch (cause) {
    throw new Error(`WordPress REST response from ${url} was not valid JSON`, { cause });
  }
}

export async function fetchWordPressRest<T>(
  country: CountryCode | string,
  path: string,
  options: FetchWordPressRestOptions = {},
): Promise<T> {
  const base = getRestBase(country);
  const url = `${base}/${path.replace(/^\/+/, "")}${buildQueryString(options.params)}`;
  const response = await fetchWithRetry(url, buildRequestInit(options));
  return (await parseJsonOrThrow(response, url)) as T;
}

export async function fetchWordPressRestList<T>(
  country: CountryCode | string,
  path: string,
  options: FetchWordPressRestOptions = {},
): Promise<WPRestListResult<T>> {
  const base = getRestBase(country);
  const url = `${base}/${path.replace(/^\/+/, "")}${buildQueryString(options.params)}`;
  const response = await fetchWithRetry(url, buildRequestInit(options));
  const pageInfo = parsePageInfo(response);
  const items = (await parseJsonOrThrow(response, url)) as T[];
  return { items: items ?? [], pageInfo };
}
