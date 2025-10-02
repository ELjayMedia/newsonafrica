import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Provide default environment variables required by config/env.ts
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://example.com'
process.env.NEXT_PUBLIC_WP_GRAPHQL ||= 'https://wp.example.com/graphql'
process.env.NEXT_PUBLIC_WP_REST_BASE ||= 'https://wp.example.com/wp-json/wp/v2'
process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||= process.env.NEXT_PUBLIC_WP_GRAPHQL
process.env.WORDPRESS_REST_API_URL ||= process.env.NEXT_PUBLIC_WP_REST_BASE
process.env.ANALYTICS_API_BASE_URL ||= 'https://analytics.example.com'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver
