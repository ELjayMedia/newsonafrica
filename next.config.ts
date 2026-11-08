import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build output directory override (NOA-117): the Playwright webServer
  // builds into its own dist dir (`.next-e2e`) so an E2E run never races a
  // concurrent `pnpm build`/`pnpm dev` sharing `.next`. Defaults to `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Integrations (Supabase, headless WordPress images, Paystack) are added in
  // later phases. Remote image patterns / rewrites belong here when wired up.

  // isomorphic-dompurify (NOA-90 article HTML sanitization, lib/sanitize-html.ts)
  // pulls in jsdom on the server, which loads assets (e.g. its default
  // stylesheet) via `require.resolve` at runtime — webpack bundling that
  // breaks page-data collection. Keep it as a real Node `require` instead of
  // bundling it.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],

  async headers() {
    return [
      {
        // Service worker (NOA-108): must revalidate on every check so new
        // versions deploy promptly instead of being pinned by the HTTP cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "eljaymedia-5k",
  project: "newsonafrica",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
