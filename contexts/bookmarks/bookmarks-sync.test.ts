import { describe, expect, it, vi } from "vitest"
import { createMutationQueue } from "./bookmarks-sync"

describe("bookmarks-sync queue", () => {
  it("retries failed offline task when process is invoked again", async () => {
    const offlineError = new TypeError("Failed to fetch")
    const schedule = vi.fn((cb: () => void) => cb())
    const task = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(offlineError)
      .mockResolvedValueOnce(undefined)

    const queue = createMutationQueue({
      schedule,
      isOfflineError: (error) => error === offlineError,
    })

    queue.enqueue(task)

    await vi.waitFor(() => {
      expect(task).toHaveBeenCalledTimes(1)
      expect(queue.pendingCount()).toBe(1)
    })

    queue.process()

    await vi.waitFor(() => {
      expect(task).toHaveBeenCalledTimes(2)
      expect(queue.pendingCount()).toBe(0)
    })
  })
})
