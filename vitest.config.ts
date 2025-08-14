import path from 'path';

import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
