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
      "sjc.microlink.io",
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
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // Remove optimizeCss which requires critters
    optimizeServerReact: true,
  },
}

module.exports = nextConfig
