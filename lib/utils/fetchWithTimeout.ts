export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: (RequestInit & { timeout?: number }) = {},
): Promise<Response> {
  const { timeout = 10000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
