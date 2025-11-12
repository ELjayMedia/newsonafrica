import { expect, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

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
process.env.WORDPRESS_PREVIEW_SECRET ||= 'test-preview-secret'

const defaultSite = process.env.NEXT_PUBLIC_DEFAULT_SITE ?? 'sz'
const graphQLKey = `NEXT_PUBLIC_WP_${defaultSite.toUpperCase()}_GRAPHQL`

process.env[graphQLKey] ||= `https://wp.example.com/${defaultSite}/graphql`
process.env.ANALYTICS_API_BASE_URL ||= 'https://analytics.example.com'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
