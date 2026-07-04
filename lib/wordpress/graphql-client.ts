/**
 * Typed WPGraphQL client (NOA-85).
 *
 * Returns a discriminated result (`{ ok: true, data }` or `{ ok: false, ... }`)
 * instead of throwing, so callers can branch on failure kind without a
 * try/catch for expected error paths (HTTP failure vs GraphQL errors vs an
 * unparsable payload). Network-level failures (timeout, DNS, etc.) still
 * reject the promise after retries are exhausted.
 *
 * Simplified/modernized from the legacy app's `lib/wordpress/client.ts`.
 */
import "server-only";

import { serverEnv } from "@/lib/env";
import { getGraphQLEndpoint, type CountryCode } from "@/lib/wordpress/countries";
import { fetchWithRetry, type FetchWithRetryOptions } from "@/lib/wordpress/http";

export type GraphQLVariables = Record<string, unknown>;

export interface FetchWordPressGraphQLOptions {
  tags?: readonly string[];
  revalidate?: number;
  timeout?: number;
  signal?: AbortSignal;
  attempts?: number;
  operationName?: string;
}

export class WordPressGraphQLHTTPError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`WordPress GraphQL request failed with status ${status}`);
    this.name = "WordPressGraphQLHTTPError";
  }
}

export class WordPressGraphQLResponseError extends Error {
  constructor(public readonly errors: Array<{ message: string; [key: string]: unknown }>) {
    super(errors[0]?.message ?? "WordPress GraphQL response contained errors");
    this.name = "WordPressGraphQLResponseError";
  }
}

export class WordPressGraphQLInvalidPayloadError extends Error {
  constructor(public readonly bodySnippet: string) {
    super("WordPress GraphQL response was not valid JSON");
    this.name = "WordPressGraphQLInvalidPayloadError";
  }
}

export type WordPressGraphQLResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "http_error"; status: number; statusText: string; error: WordPressGraphQLHTTPError }
  | {
      ok: false;
      kind: "graphql_error";
      errors: Array<{ message: string; [key: string]: unknown }>;
      error: WordPressGraphQLResponseError;
    }
  | { ok: false; kind: "invalid_payload"; bodySnippet: string; error: WordPressGraphQLInvalidPayloadError };

function truncate(body: string, maxLength = 512): string {
  return body.length <= maxLength ? body : `${body.slice(0, maxLength)}…`;
}

function buildRequestInit(
  body: string,
  options: FetchWordPressGraphQLOptions,
): FetchWithRetryOptions {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serverEnv.WORDPRESS_API_AUTH_HEADER) {
    headers.Authorization = serverEnv.WORDPRESS_API_AUTH_HEADER;
  }

  const init: FetchWithRetryOptions = {
    method: "POST",
    headers,
    body,
    timeout: options.timeout ?? serverEnv.WORDPRESS_REQUEST_TIMEOUT_MS,
    signal: options.signal,
    attempts: options.attempts,
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

/**
 * Execute a GraphQL query/mutation against a country's WPGraphQL endpoint.
 */
export async function fetchWordPressGraphQL<T>(
  country: CountryCode | string,
  query: string,
  variables?: GraphQLVariables,
  options: FetchWordPressGraphQLOptions = {},
): Promise<WordPressGraphQLResult<T>> {
  const endpoint = getGraphQLEndpoint(country);
  const body = JSON.stringify({ query, variables, operationName: options.operationName });

  const response = await fetchWithRetry(endpoint, buildRequestInit(body, options));

  if (!response.ok) {
    const status = response.status;
    const statusText = response.statusText;
    return {
      ok: false,
      kind: "http_error",
      status,
      statusText,
      error: new WordPressGraphQLHTTPError(status, statusText),
    };
  }

  const rawBody = await response.text();
  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    const snippet = truncate(rawBody);
    return { ok: false, kind: "invalid_payload", bodySnippet: snippet, error: new WordPressGraphQLInvalidPayloadError(snippet) };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    const snippet = truncate(rawBody);
    return { ok: false, kind: "invalid_payload", bodySnippet: snippet, error: new WordPressGraphQLInvalidPayloadError(snippet) };
  }

  const json = parsed as { data?: T; errors?: Array<{ message: string; [key: string]: unknown }> };

  if (json.errors && json.errors.length > 0) {
    return { ok: false, kind: "graphql_error", errors: json.errors, error: new WordPressGraphQLResponseError(json.errors) };
  }

  return { ok: true, data: (json.data ?? null) as T };
}
