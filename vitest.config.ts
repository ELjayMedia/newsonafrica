import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "legacy/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "lib/testing/**",
        "lib/env.ts",
        "lib/supabase/**",
      ],
      thresholds: {
        lines: 30,
        statements: 30,
        branches: 70,
        functions: 85,
      },
    },
    env: {
      SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      WORDPRESS_API_URL: "https://cms.test.example",
      WORDPRESS_WEBHOOK_SECRET: "test-webhook-secret-0123456789",
      CONTENT_SYNC_SECRET: "test-content-sync-secret-0123456789",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./lib/testing/server-only-stub.ts"),
    },
  },
});
