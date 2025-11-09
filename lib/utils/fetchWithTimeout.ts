export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: (RequestInit & { timeout?: number; next?: NextFetchRequestConfig }) = {},
): Promise<Response> {
  const { timeout = 10000, next, signal, ...rest } = options
  const controller = new AbortController()
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined

  const abortFromSignal = () => controller.abort()
  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener("abort", abortFromSignal, { once: true })
    }
  }

  try {
    return await fetch(resource, { ...rest, next, signal: controller.signal })
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (signal) {
      signal.removeEventListener("abort", abortFromSignal)
    }
  }
}
