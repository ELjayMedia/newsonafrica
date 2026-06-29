import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Integrations (Supabase, headless WordPress images, Paystack) are added in
  // later phases. Remote image patterns / rewrites belong here when wired up.
};

export default nextConfig;
