/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['xeleven.space', 'cdn.sanity.io'],
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
