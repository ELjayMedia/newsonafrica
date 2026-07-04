/**
 * @deprecated
 * Standard WordPress content flows use Next.js fetch cache + tags.
 * This module remains only as a compatibility shim for older imports.
 */

export const wordPressCache = {
  set: <T>(_key: string, _data: T, _ttl?: number): void => {},
  get: <T>(_key: string): T | null => null,
  delete: (_key: string): void => {},
  clear: (): void => {},
  keys: (): string[] => [],
  generateKey: (type: string, params: Record<string, any>): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|")
    return `${type}:${sortedParams}`
  },
  getStats: () => ({ size: 0, calculatedSize: 0, max: 0 }),
}

export async function getCachedData<T>(key: string, fetcher: () => Promise<T>, _ttl?: number): Promise<T> {
  void key
  return fetcher()
}

export function invalidateCache(_pattern: string): void {}
