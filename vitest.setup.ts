import { beforeEach, expect, vi } from 'vitest'
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

// Provide default environment variables required by config/env.ts
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://example.com'
process.env.NEXT_PUBLIC_DEFAULT_SITE ||= 'sz'

const defaultSite = process.env.NEXT_PUBLIC_DEFAULT_SITE ?? 'sz'
const graphQLKey = `NEXT_PUBLIC_WP_${defaultSite.toUpperCase()}_GRAPHQL`

process.env[graphQLKey] ||= `https://wp.example.com/${defaultSite}/graphql`
process.env.ANALYTICS_API_BASE_URL ||= 'https://analytics.example.com'

// Keep article fallback unit tests deterministic when CI exposes real edition
// endpoints or fallback feature flags. Other test files keep the normal setup.
beforeEach((context) => {
  const filePath = context.task?.file?.filepath ?? ''

  if (!filePath.endsWith('article-data.test.ts')) {
    return
  }

  vi.stubEnv('FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK', '')
  vi.stubEnv('ARTICLE_CROSS_POST_POLICY', '')
  vi.stubEnv('NEXT_PUBLIC_WP_NG_GRAPHQL', '')
  vi.stubEnv('NEXT_PUBLIC_WP_ZA_GRAPHQL', '')
})

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
