const runtimeCaching = [
  {
    urlPattern: ({ request }) => {
      if (request.destination === "document") {
        return true
      }

      const acceptHeader = request.headers.get("accept") || ""
      return acceptHeader.includes("text/html") || acceptHeader.includes("application/json")
    },
    handler: "NetworkFirst",
    options: {
      cacheName: "document-cache",
      networkTimeoutSeconds: 3,
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 30, // 30 minutes
      },
    },
  },
  {
    urlPattern: /^https:\/\/newsonafrica\.com\/api\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "api-cache",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)/i,
    handler: ({ url, event, request, params }) => {
      const hostname = url?.hostname || "default"
      const cacheName = `image-cache-${hostname}`
      self.__WB_IMAGE_CACHE_STRATEGIES__ = self.__WB_IMAGE_CACHE_STRATEGIES__ || {}
      let strategy = self.__WB_IMAGE_CACHE_STRATEGIES__[cacheName]

      if (!strategy) {
        strategy = new workbox.strategies.StaleWhileRevalidate({
          cacheName,
          plugins: [
            new workbox.expiration.ExpirationPlugin({
              maxEntries: 45,
              maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
              purgeOnQuotaError: true,
            }),
          ],
        })
        self.__WB_IMAGE_CACHE_STRATEGIES__[cacheName] = strategy
      }

      return strategy.handle({ event, request, url, params })
    },
  },
]

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: false,
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/offline",
    image: "/placeholder.svg",
  },
  workboxOptions: {
    runtimeCaching,
  },
  extendDefaultRuntimeCaching: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    domains: [
      "newsonafrica.com",
      "secure.gravatar.com",
      "i0.wp.com",
      "i1.wp.com",
      "i2.wp.com",
      "blob.v0.dev",
      "cdn-lfdfp.nitrocdn.com",
      "via.placeholder.com",
      "lh3.googleusercontent.com",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "newsonafrica.com", pathname: "**" },
      { protocol: "https", hostname: "*.newsonafrica.com", pathname: "**" },
      { protocol: "https", hostname: "secure.gravatar.com", pathname: "**" },
      { protocol: "https", hostname: "i0.wp.com", pathname: "**" },
      { protocol: "https", hostname: "i1.wp.com", pathname: "**" },
      { protocol: "https", hostname: "i2.wp.com", pathname: "**" },
      { protocol: "https", hostname: "*.wordpress.com", pathname: "**" },
      { protocol: "https", hostname: "blob.v0.dev", pathname: "**" },
      { protocol: "https", hostname: "cdn-lfdfp.nitrocdn.com", pathname: "**" },
      { protocol: "https", hostname: "via.placeholder.com", pathname: "**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/service-worker.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
      {
        source: "/(.*)\\.js$",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  experimental: {
    scrollRestoration: true,
    largePageDataBytes: 12800000,
    typedRoutes: true,
  },
  serverExternalPackages: ["sharp", "react-dom/server"],
}

module.exports = withPWA(nextConfig)
