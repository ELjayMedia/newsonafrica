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
      "sjc.microlink.io", // Added missing domain for logo
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
  webpack: (config, { isServer, dev }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        path: require.resolve("path-browserify"),
        zlib: require.resolve("browserify-zlib"),
      }
    }

    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
    }

    // Return the modified config
    return config
  },
  experimental: {
    // Remove optimizeCss which requires critters
    optimizeServerReact: true,
    // Improve module resolution
    esmExternals: "loose",
  },
}

module.exports = nextConfig
