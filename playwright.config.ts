import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration (NOA-117).
 *
 * Two web servers are started for a test run:
 *  1. e2e/fixtures/wp-stub.mjs — a tiny WordPress REST stub, because the
 *     Next.js server fetches CMS content server-side (browser-level route
 *     interception can't mock it) and no live WordPress exists in CI.
 *  2. The production Next.js build (`pnpm build && pnpm start`) with env
 *     pointing WordPress at the stub and Supabase at an unreachable local
 *     URL — every Supabase-backed surface degrades gracefully by design
 *     (most-read rail, auth session, search), which is exactly what the
 *     smoke specs assert: the page shells render without live backends.
 *
 * Browsers: `PLAYWRIGHT_BROWSERS_PATH` is honored automatically. In this
 * repo's sandbox the matching chromium build is pre-installed under
 * /opt/pw-browsers (hence @playwright/test is pinned to 1.56.x); in CI run
 * `pnpm exec playwright install --with-deps chromium` first.
 *
 * Overrides:
 *  - PLAYWRIGHT_BASE_URL: point at an already-running app (preview deploy).
 *  - PLAYWRIGHT_SKIP_WEB_SERVER=1: don't start any server (use with the above).
 */

const APP_PORT = Number(process.env.PLAYWRIGHT_APP_PORT ?? 3100);
const WP_STUB_PORT = Number(process.env.WP_STUB_PORT ?? 3101);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${APP_PORT}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";

/**
 * Dummy-but-valid env for building/running the app without live backends.
 * Values mirror vitest.config.ts and .env.example; WORDPRESS_API_URL is the
 * fixture stub above.
 */
const appEnv = {
  // Isolated build output so an E2E run never races another build using .next
  // (see distDir in next.config.ts).
  NEXT_DIST_DIR: ".next-e2e",
  SITE_URL: BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  WORDPRESS_API_URL: `http://127.0.0.1:${WP_STUB_PORT}`,
  // Keep CMS fetch failures fast: short timeout, single attempt is handled
  // by retry logic; unreachable routes fail within the spec timeout.
  WORDPRESS_REQUEST_TIMEOUT_MS: "5000",
  WORDPRESS_WEBHOOK_SECRET: "test-webhook-secret-0123456789",
  CONTENT_SYNC_SECRET: "test-content-sync-secret-0123456789",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\..*\.spec\.ts/,
    },
    {
      // Mobile viewport for bottom-navigation & responsive chrome checks.
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile\..*\.spec\.ts/,
    },
  ],
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: `node e2e/fixtures/wp-stub.mjs`,
          url: `http://127.0.0.1:${WP_STUB_PORT}/sz/wp-json/wp/v2/posts`,
          reuseExistingServer: !process.env.CI,
          timeout: 15_000,
          env: { WP_STUB_PORT: String(WP_STUB_PORT) },
        },
        {
          command: `pnpm build && pnpm start --port ${APP_PORT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
          stdout: "pipe",
          stderr: "pipe",
          env: appEnv,
        },
      ],
});
