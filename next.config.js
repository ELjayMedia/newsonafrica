/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "news-on-africa.vercel.app",
      "localhost",
      "via.placeholder.com",
      "images.unsplash.com",
      "plus.unsplash.com",
      "news24.com",
      "cdn.24.co.za",
      "media.licdn.com",
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      // Legacy routes redirects
      {
        source: "/pages/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/articles/:slug",
        destination: "/post/:slug",
        permanent: true,
      },
      {
        source: "/news-category/:slug",
        destination: "/category/:slug",
        permanent: true,
      },
      {
        source: "/tags/:slug",
        destination: "/tag/:slug",
        permanent: true,
      },
      {
        source: "/writers/:slug",
        destination: "/author/:slug",
        permanent: true,
      },
    ]
  },
}

// Configure PWA
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})

// Configure Bundle Analyzer
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

// Export with all configurations applied
module.exports = withBundleAnalyzer(withPWA(nextConfig))
