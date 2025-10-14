import type { NextFetchRequestConfig } from "next/server"
import { appConfig } from "@/lib/config"

const DEFAULT_TIMEOUT = appConfig.wordpress.timeout

export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: (RequestInit & { timeout?: number; next?: NextFetchRequestConfig }) = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, next, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...rest, next, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
