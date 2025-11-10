type ExtendedRequestInit = RequestInit & { agent?: unknown }

export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: (ExtendedRequestInit & { timeout?: number; next?: NextFetchRequestConfig }) = {},
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
    const fetchOptions = { ...rest, next, signal: controller.signal } as ExtendedRequestInit
    return await fetch(resource, fetchOptions)
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (signal) {
      signal.removeEventListener("abort", abortFromSignal)
    }
  }
}
