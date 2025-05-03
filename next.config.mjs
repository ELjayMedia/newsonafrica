/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cdn-lfdfp.nitrocdn.com', 'via.placeholder.com', 'picsum.photos'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // Disable static generation features that might cause issues
  experimental: {
    // Remove optimizeCss as it requires critters
    // optimizeCss: true,
    ppr: false, // Disable Partial Prerendering
  },
  // Remove the unstable_excludeFiles option since we're deleting the /404 directory
  // unstable_excludeFiles: ['**/app/404/**/*'],
}

export default nextConfig
