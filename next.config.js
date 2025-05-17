/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      "images.unsplash.com",
      "news-on-africa-images.s3.amazonaws.com",
      "news-on-africa.com",
      "api.news-on-africa.com",
      "picsum.photos",
      "placehold.co",
      "via.placeholder.com",
      "lh3.googleusercontent.com", // Google avatars
      "graph.facebook.com", // Facebook avatars
      "avatars.githubusercontent.com", // GitHub avatars
      "images.example.com",
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    formats: ["image/avif", "image/webp"],
    unoptimized: true, // Added from updates
  },
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || "development",
  },
  eslint: {
    ignoreDuringBuilds: true, // Added from updates
  },
  typescript: {
    ignoreBuildErrors: true, // Added from updates
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth",
        permanent: true,
      },
      {
        source: "/signup",
        destination: "/auth?mode=signup",
        permanent: true,
      },
      {
        source: "/logout",
        destination: "/api/auth/logout",
        permanent: true,
      },
    ]
  },
  // Add proper CORS headers for API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ]
  },
  // Ensure proper handling of JSON responses
  experimental: {
    serverComponentsExternalPackages: ["@tanstack/react-query"],
  },
}

module.exports = nextConfig
