const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/',
  fallbacks: {
    document: '/offline',
    image: '/placeholder.png',
  },
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api') || url.pathname.startsWith('/auth'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        networkTimeoutSeconds: 30,
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'font',
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'export',
  images: {
    unoptimized: true,
    domains: [
      'newsonafrica.com',
      'secure.gravatar.com',
      'i0.wp.com',
      'i1.wp.com',
      'i2.wp.com',
      'blob.v0.dev',
      'cdn-lfdfp.nitrocdn.com',
      'via.placeholder.com',
    ],
    formats: ['image/avif', 'image/webp'],
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
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/(.*)\\.js$',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (process.env.INCLUDE_RN_WEB === 'true') {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react-native$': 'react-native-web',
      };

      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          crypto: require.resolve('crypto-browserify'),
          stream: require.resolve('stream-browserify'),
          path: require.resolve('path-browserify'),
        };
      }
    } else {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }
    }

    if (isServer) {
      config.externals = [...(config.externals || []), 'react-native-web'];
    }

    return config;
  },
  experimental: {
    scrollRestoration: true,
    largePageDataBytes: 12800000,
  },
  serverExternalPackages: ['sharp', 'react-dom/server'],
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
