import pLimit from "p-limit"

export interface TaskContext {
  signal: AbortSignal
  timeout: number
}

/**
 * Creates a task scheduler with concurrency limiting and timeout support.
 * Tasks are executed with an AbortSignal that is automatically aborted after the timeout.
 */
export function createTaskScheduler(concurrency: number) {
  const limiter = pLimit(concurrency)

  return function scheduleTask<T>(
    timeoutMs: number,
    task: (context: TaskContext) => Promise<T>,
  ): Promise<T> {
    return limiter(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        return await task({ signal: controller.signal, timeout: timeoutMs })
      } finally {
        clearTimeout(timeoutId)
      }
    })
  }
}

/**
 * Pre-configured task scheduler for home feed operations.
 * Can be customized with different concurrency levels.
 */
export const createHomeFeedTaskScheduler = (concurrency: number) =>
  createTaskScheduler(concurrency)
