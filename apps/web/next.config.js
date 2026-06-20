/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
    "lodash-es": {
      transform: "lodash-es/{{member}}",
    },
    "lucide-react": {
      transform: "lucide-react/icons/{{member}}",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            // next.js requires 'unsafe-inline' for its own hydration scripts/styles.
            // frame-ancestors, base-uri, and form-action provide meaningful protection
            // without needing a nonce-based setup.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.paystack.com",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
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
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "newsonafrica.com", pathname: "**" },
      { protocol: "https", hostname: "news-on-africa.com", pathname: "**" },
      { protocol: "https", hostname: "*.newsonafrica.com", pathname: "**" },
      { protocol: "https", hostname: "secure.gravatar.com", pathname: "**" },
      { protocol: "https", hostname: "i0.wp.com", pathname: "**" },
      { protocol: "https", hostname: "i1.wp.com", pathname: "**" },
      { protocol: "https", hostname: "i2.wp.com", pathname: "**" },
      { protocol: "https", hostname: "*.wordpress.com", pathname: "**" },
      { protocol: "https", hostname: "cdn-lfdfp.nitrocdn.com", pathname: "**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
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
    // Suppress the "Serializing big strings" warning by increasing the threshold
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    }
    return config
  },
  experimental: {
    scrollRestoration: true,
    largePageDataBytes: 12800000,
    optimizePackageImports: ["lucide-react", "date-fns", "lodash-es"],
  },
  serverExternalPackages: ["sharp"],
}

// Only apply bundle analyzer when ANALYZE env var is set
let config = nextConfig
if (process.env.ANALYZE === "true") {
  try {
    const withAnalyzer = require("@next/bundle-analyzer")
    config = withAnalyzer({ enabled: true })(nextConfig)
  } catch (error) {
    console.warn("@next/bundle-analyzer not available, skipping analyzer")
  }
}
module.exports = config
