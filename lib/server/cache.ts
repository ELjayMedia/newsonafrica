import "server-only"

export async function getCachedFunction<T>(
  fn: () => Promise<T>,
  keys: string[],
  options?: {
    tags?: string[]
    revalidate?: number | false
  },
): Promise<T> {
  // Dynamic import to avoid initialization errors
  const { unstable_cache } = await import("next/cache")

  const cachedFn = unstable_cache(fn, keys, options)
  return cachedFn()
}

export async function createCachedWrapper<TArgs extends unknown[], TResult>(
  source: (...args: TArgs) => Promise<TResult>,
  keyParts: readonly string[],
  options?: {
    tags?: readonly string[]
    revalidate?: number
  },
): Promise<(...args: TArgs) => Promise<TResult>> {
  const { unstable_cache } = await import("next/cache")

  const dedupe = (values?: readonly string[]): string[] | undefined => {
    if (!values?.length) return undefined
    return Array.from(new Set(values))
  }

  return (...args: TArgs) => {
    const cached = unstable_cache(source, Array.from(keyParts), {
      revalidate: options?.revalidate,
      tags: dedupe(options?.tags),
    })
    return cached(...args)
  }
}
