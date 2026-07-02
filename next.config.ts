import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Integrations (Supabase, headless WordPress images, Paystack) are added in
  // later phases. Remote image patterns / rewrites belong here when wired up.

  // isomorphic-dompurify (NOA-90 article HTML sanitization, lib/sanitize-html.ts)
  // pulls in jsdom on the server, which loads assets (e.g. its default
  // stylesheet) via `require.resolve` at runtime — webpack bundling that
  // breaks page-data collection. Keep it as a real Node `require` instead of
  // bundling it.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
