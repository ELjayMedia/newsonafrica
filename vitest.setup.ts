import { expect, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// The `server-only` package intentionally throws at import time outside of a
// Server Component. In tests we run server-scoped modules under jsdom, so
// stub it to a no-op — the boundary is still enforced by the Next.js bundler
// in app/production builds.
vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  unstable_cache:
    <T extends (...args: any[]) => any>(fn: T) =>
    (...args: Parameters<T>): ReturnType<T> =>
      fn(...args),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_noStore: vi.fn(),
}))

vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: (html: string) =>
      html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, ''),
  },
}))

// Provide deterministic environment variables required by config/env.ts.
// CI may expose real WordPress endpoints for every edition; unit tests should
// opt into those explicitly via vi.stubEnv instead of inheriting them globally.
process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
process.env.NEXT_PUBLIC_DEFAULT_SITE = 'sz'
process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = 'https://wp.example.com/sz/graphql'
process.env.NEXT_PUBLIC_WP_NG_GRAPHQL = ''
process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = ''
process.env.FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK = ''
process.env.ARTICLE_CROSS_POST_POLICY = ''
process.env.ANALYTICS_API_BASE_URL = 'https://analytics.example.com'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
