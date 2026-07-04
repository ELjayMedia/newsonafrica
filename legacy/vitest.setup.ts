import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Unmount React trees after every test. Without globals:true, Testing Library
// does not auto-register cleanup, so rendered DOM leaks between tests and
// queries like getByAltText find duplicates from earlier tests.
afterEach(() => {
  cleanup()
})

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
process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL ||= 'https://wp.example.com/sz/graphql'
process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL ||= 'https://wp.example.com/za/graphql'
process.env.NEXT_PUBLIC_WP_NG_GRAPHQL ||= 'https://wp.example.com/ng/graphql'
process.env.ANALYTICS_API_BASE_URL ||= 'https://analytics.example.com'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
