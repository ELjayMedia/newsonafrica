import { expect } from 'vitest'

// make expect available before importing jest-dom
// @ts-ignore
globalThis.expect = expect
await import('@testing-library/jest-dom')

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore
global.ResizeObserver = ResizeObserver

