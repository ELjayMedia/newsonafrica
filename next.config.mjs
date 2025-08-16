import withPWA from '@ducanh2912/next-pwa'

const withPwa = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/newsonafrica\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'wp-api',
        expiration: { maxAgeSeconds: 300 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
})

const nextConfig = {
  reactStrictMode: true,
}

export default withPwa(nextConfig)
