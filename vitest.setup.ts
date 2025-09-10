import { expect } from 'vitest'
import matchers from '@testing-library/jest-dom/matchers'
expect.extend(matchers)
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserver

