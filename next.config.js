/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'xeleven.space'},
      {protocol: 'https', hostname: 'cdn.sanity.io'},
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'node:module': false,
      'module': false,
      'fs': false,
      'path': false,
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      'node:module': false,
    }

    return config
  },
}

module.exports = nextConfig
