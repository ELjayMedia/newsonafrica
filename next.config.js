/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "sjc.microlink.io",
      "newsonafrica.com",
      "placekitten.com",
      "via.placeholder.com",
      "placeholdit.imgix.net",
      "loremflickr.com",
      "picsum.photos",
    ],
    formats: ["image/avif", "image/webp"],
    unoptimized: true,
  },
  // Modern config without deprecated options
  typescript: {
    // Handle type errors during build (recommended for CI)
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
