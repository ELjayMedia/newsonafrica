import type { BookmarkListRow } from "@/types/bookmarks"
import { buildHydrationPayload, type BookmarkHydrationMap } from "./bookmarks-mappers"

export const BOOKMARK_SYNC_QUEUE = "bookmarks-write-queue"

export const isOfflineError = (error: unknown) => {
  if (typeof navigator === "undefined") return false
  if (!navigator.onLine) return true
  if (error instanceof TypeError && error.message?.includes("Failed to fetch")) {
    return true
  }
  return false
}

export interface BookmarkHydrator {
  hydrate: (rows: BookmarkListRow[]) => Promise<BookmarkHydrationMap>
}

export const createBookmarkHydrator = (
  fetchImpl: typeof fetch = fetch,
  endpoint = "/api/bookmarks/hydrate",
): BookmarkHydrator => ({
  hydrate: async (rows: BookmarkListRow[]): Promise<BookmarkHydrationMap> => {
    if (rows.length === 0) {
      return {}
    }

    const hydrationPayload = buildHydrationPayload(rows)

    if (hydrationPayload.length === 0) {
      return {}
    }

    try {
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hydrationPayload),
      })

      if (!res.ok) {
        console.error("Failed to hydrate bookmarks: HTTP", res.status)
        return {}
      }

      const json = (await res.json()) as { posts?: BookmarkHydrationMap }
      return json.posts || {}
    } catch (error) {
      console.error("Failed to hydrate bookmarks", error)
      return {}
    }
  },
})

export interface MutationQueue {
  enqueue: (task: () => Promise<void>) => void
  process: () => void
  pendingCount: () => number
}

interface MutationQueueDeps {
  schedule: (cb: () => void) => void
  isOfflineError: (error: unknown) => boolean
  onError?: (error: unknown) => void
}

export const createMutationQueue = ({ schedule, isOfflineError, onError }: MutationQueueDeps): MutationQueue => {
  const queue: Array<() => Promise<void>> = []
  let processing = false

  const runNext = async (): Promise<void> => {
    const nextTask = queue.shift()
    if (!nextTask) {
      processing = false
      return
    }

    try {
      await nextTask()
    } catch (error) {
      if (isOfflineError(error)) {
        queue.unshift(nextTask)
        processing = false
        return
      }

      onError?.(error)
    }

    await runNext()
  }

  const process = () => {
    if (processing) return
    processing = true
    schedule(() => {
      void runNext()
    })
  }

  const enqueue = (task: () => Promise<void>) => {
    queue.push(task)
    process()
  }

  return {
    enqueue,
    process,
    pendingCount: () => queue.length,
  }
}
