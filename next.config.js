const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/newsonafrica\.com\/api\/.*/i,
      handler: "NetworkFirst",
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
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "js-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:css)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "css-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
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
    domains: [
      "newsonafrica.com",
      "secure.gravatar.com",
      "i0.wp.com",
      "i1.wp.com",
      "i2.wp.com",
      "blob.v0.dev",
      "cdn-lfdfp.nitrocdn.com",
      "via.placeholder.com",
    ],
    formats: ["image/avif", "image/webp"],
    // Remove unoptimized: true to use Vercel's image optimization
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
    // Only apply React Native Web config when specifically needed
    if (process.env.INCLUDE_RN_WEB === "true") {
      // Handle React Native Web properly
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "react-native$": "react-native-web",
      }

      // Add fallbacks only when using RN Web
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          // Keep only the essential fallbacks
          crypto: require.resolve("crypto-browserify"),
          stream: require.resolve("stream-browserify"),
          path: require.resolve("path-browserify"),
        }
      }
    } else {
      // Default fallbacks for non-RN Web builds
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        }
      }
    }

    // Always exclude problematic dependencies from server build
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "react-native-web",
        "@react-native-firebase/app",
        "@react-native-firebase/analytics",
      ]
    }

    return config
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    largePageDataBytes: 12800000, // Increase the limit for large page data
  },
  serverExternalPackages: ["sharp", "react-dom/server"],
}

module.exports = withPWA(nextConfig)
