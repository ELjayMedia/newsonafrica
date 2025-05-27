const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
<<<<<<< HEAD
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/",
  fallbacks: {
    document: "/offline",
    image: "/placeholder.png",
=======
  dynamicStartUrl: true, // Enable dynamic start URL
  dynamicStartUrlRedirect: "/", // Redirect to home if start URL is not available
  fallbacks: {
    // Define fallback routes for offline mode
    document: "/offline", // Fallback for document (HTML) requests
    image: "/placeholder.png", // Fallback for image requests
>>>>>>> refs/remotes/origin/main
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/newsonafrica\.com\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 50,
<<<<<<< HEAD
          maxAgeSeconds: 60 * 60 * 24,
=======
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
          maxAgeSeconds: 7 * 24 * 60 * 60,
=======
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
          maxAgeSeconds: 30 * 24 * 60 * 60,
=======
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
          maxAgeSeconds: 7 * 24 * 60 * 60,
=======
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
          maxAgeSeconds: 7 * 24 * 60 * 60,
=======
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
>>>>>>> refs/remotes/origin/main
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
    unoptimized: true,
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
<<<<<<< HEAD
=======
    // Remove unoptimized: true to use Vercel's image optimization
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
    if (process.env.INCLUDE_RN_WEB === "true") {
=======
    // Only apply React Native Web config when specifically needed
    if (process.env.INCLUDE_RN_WEB === "true") {
      // Handle React Native Web properly
>>>>>>> refs/remotes/origin/main
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "react-native$": "react-native-web",
      }

<<<<<<< HEAD
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
=======
      // Add fallbacks only when using RN Web
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          // Keep only the essential fallbacks
>>>>>>> refs/remotes/origin/main
          crypto: require.resolve("crypto-browserify"),
          stream: require.resolve("stream-browserify"),
          path: require.resolve("path-browserify"),
        }
      }
    } else {
<<<<<<< HEAD
=======
      // Default fallbacks for non-RN Web builds
>>>>>>> refs/remotes/origin/main
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        }
      }
    }

<<<<<<< HEAD
=======
    // Always exclude problematic dependencies from server build
>>>>>>> refs/remotes/origin/main
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
<<<<<<< HEAD
    largePageDataBytes: 12800000,
  },
  serverExternalPackages: ["sharp", "react-dom/server"],
  env: {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
=======
    largePageDataBytes: 12800000, // Increase the limit for large page data
>>>>>>> refs/remotes/origin/main
  },
  serverExternalPackages: ["sharp", "react-dom/server"],
}

module.exports = withPWA(nextConfig)
