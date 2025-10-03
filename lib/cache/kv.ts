const UPSTASH_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.UPSTASH_KV_REST_URL ||
  process.env.UPSTASH_REDIS_REST_ENDPOINT ||
  null
const UPSTASH_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.UPSTASH_KV_REST_TOKEN ||
  null

const sanitizedBaseUrl = UPSTASH_URL ? UPSTASH_URL.replace(/\/$/, "") : null

interface KvResponse<T> {
  result: T | null
  error?: string | null
}

export interface KvCacheEntry<T> {
  value: T
  metadata: {
    updatedAt: number
  }
}

type RequestLike = Request & { waitUntil?(promise: Promise<unknown>): void }

class UpstashKvClient {
  private readonly baseUrl: string | null
  private readonly token: string | null

  constructor(url: string | null, token: string | null) {
    this.baseUrl = url
    this.token = token
  }

  get isEnabled(): boolean {
    return Boolean(this.baseUrl && this.token)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<KvResponse<T>> {
    if (!this.isEnabled || !this.baseUrl || !this.token) {
      return { result: null }
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Upstash KV request failed for ${path}`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        return { result: null, error: response.statusText }
      }

      const data = (await response.json()) as KvResponse<T>

      if (data.error) {
        console.error(`Upstash KV error for ${path}`, { error: data.error })
      }

      return data
    } catch (error) {
      console.error(`Upstash KV request threw for ${path}`, { error })
      return { result: null, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async get<T>(key: string): Promise<KvCacheEntry<T> | null> {
    const encodedKey = encodeURIComponent(key)
    const response = await this.request<string>(`/get/${encodedKey}`)

    if (!response.result) {
      return null
    }

    try {
      try {
        return JSON.parse(response.result) as KvCacheEntry<T>
      } catch {
        const decoded = decodeURIComponent(response.result)
        return JSON.parse(decoded) as KvCacheEntry<T>
      }
    } catch (error) {
      console.error("Failed to parse Upstash KV entry", { key, error })
      return null
    }
  }

  async set<T>(key: string, value: KvCacheEntry<T>, ttlSeconds: number): Promise<void> {
    if (!this.isEnabled || !this.baseUrl) {
      return
    }

    const encodedKey = encodeURIComponent(key)
    const encodedValue = encodeURIComponent(JSON.stringify(value))
    const path = `/set/${encodedKey}/${encodedValue}?EX=${ttlSeconds}`

    await this.request(path, { method: "POST" })
  }

  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.baseUrl) {
      return
    }

    const encodedKey = encodeURIComponent(key)
    await this.request(`/del/${encodedKey}`, { method: "POST" })
  }

  runBackgroundRefresh(
    request: RequestLike | null | undefined,
    refresh: () => Promise<unknown>,
  ): void {
    const task = (async () => {
      try {
        await refresh()
      } catch (error) {
        console.error("Background KV refresh failed", { error })
      }
    })()

    if (request && typeof request.waitUntil === "function") {
      try {
        request.waitUntil(task)
        return
      } catch (error) {
        console.error("request.waitUntil failed", { error })
      }
    }

    task.catch((error) => {
      console.error("Unhandled background refresh error", { error })
    })
  }
}

export const kvCache = new UpstashKvClient(sanitizedBaseUrl, UPSTASH_TOKEN)

export function createCacheEntry<T>(value: T): KvCacheEntry<T> {
  return {
    value,
    metadata: {
      updatedAt: Date.now(),
    },
  }
}

export function getEntryAge(entry: KvCacheEntry<unknown> | null | undefined): number {
  if (!entry?.metadata?.updatedAt) {
    return Number.POSITIVE_INFINITY
  }
  return Date.now() - entry.metadata.updatedAt
}

export type { UpstashKvClient }
