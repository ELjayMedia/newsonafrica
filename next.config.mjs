import withPWA from "@ducanh2912/next-pwa"

const nextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: false },
  experimental: { typedRoutes: true }
}

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  workboxOptions: {
    navigateFallback: "/offline",
  },
})(nextConfig)
