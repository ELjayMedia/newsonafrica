export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: (RequestInit & { timeout?: number; next?: NextFetchRequestConfig }) = {},
): Promise<Response> {
  const { timeout = 10000, next, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...rest, next, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
