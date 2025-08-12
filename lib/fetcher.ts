import { z } from "zod";

/** Cache entry for ETag based caching */
interface CacheEntry<T> {
  etag?: string;
  data: T;
  timestamp: number;
  ttl: number;
}

const inflight = new Map<string, Promise<any>>();
const cache = new Map<string, CacheEntry<any>>();

export interface FetcherOptions<T> {
  /** Request init options forwarded to fetch */
  init?: RequestInit;
  /** Timeout in ms (default 8000) */
  timeoutMs?: number;
  /** Retry count for 429/5xx responses (default 2) */
  retries?: number;
  /** Cache TTL in ms for 200 responses (default 5 min) */
  cacheTtl?: number;
  /** Optional zod schema for runtime validation */
  schema?: z.ZodType<T>;
}

export class FetchError extends Error {
  status?: number;
  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    if (cause) {
      // @ts-ignore - Node <18 does not have cause in ErrorOptions type
      this.cause = cause;
    }
  }
}

const metrics = {
  hits: 0,
  misses: 0,
  logHit(url: string) {
    this.hits++;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[cache hit] ${url}`);
    }
  },
  logMiss(url: string) {
    this.misses++;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[cache miss] ${url}`);
    }
  },
};

async function runFetch<T>(url: string, options: FetcherOptions<T>): Promise<T> {
  const {
    init = {},
    timeoutMs = 8000,
    retries = 2,
    cacheTtl = 5 * 60 * 1000,
    schema,
  } = options;

  const key = url + JSON.stringify(init);

  // request deduplication
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const promise = (async () => {
    const cached = cache.get(key);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const headers: Record<string, string> = {
          "Accept-Encoding": "gzip, br",
          Connection: "keep-alive",
          ...(init.headers as any),
        };
        if (cached?.etag) {
          headers["If-None-Match"] = cached.etag;
        }

        const resp = await fetch(url, { ...init, headers, signal: controller.signal });
        clearTimeout(timeout);

        if (resp.status === 304 && cached) {
          metrics.logHit(url);
          return cached.data as T;
        }

        if (!resp.ok) {
          if (resp.status === 429 || resp.status >= 500) {
            throw new FetchError(`Retryable status ${resp.status}`, resp.status);
          }
          throw new FetchError(`HTTP error ${resp.status}`, resp.status);
        }

        const etag = resp.headers.get("etag") || undefined;
        const data: T = await resp.json();
        if (schema) {
          schema.parse(data);
        }
        cache.set(key, { etag, data, timestamp: Date.now(), ttl: cacheTtl });
        metrics.logMiss(url);
        return data;
      } catch (err) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 200;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new FetchError("Fetch failed", undefined, err);
      }
    }
    // should not reach here
    throw new FetchError("Exhausted retries");
  })();

  inflight.set(key, promise);
  promise.finally(() => inflight.delete(key));
  return promise;
}

export async function fetcher<T = any>(url: string, options: FetcherOptions<T> = {}): Promise<T> {
  return runFetch<T>(url, options);
}

export { metrics };
