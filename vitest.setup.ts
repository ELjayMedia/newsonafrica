import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Provide default environment variables required by config/env.ts
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://example.com'
process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||= 'https://wp.example.com/graphql'
process.env.WORDPRESS_REST_API_URL ||= 'https://wp.example.com/wp-json'
process.env.ANALYTICS_API_BASE_URL ||= 'https://analytics.example.com'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
