/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
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
    ]
  },
  images: {
    unoptimized: false,
    domains: [
      "newsonafrica.com",
      "news-on-africa.com",
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
      { protocol: "https", hostname: "news-on-africa.com", pathname: "**" },
      { protocol: "https", hostname: "newsonafrica.com/*", pathname: "**" },
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
  },
  serverExternalPackages: ["sharp", "react-dom/server"],
}

module.exports = nextConfig
