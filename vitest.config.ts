import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    coverage: {
      provider: 'v8',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
})
