import type { NextConfig } from 'next'
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!icons/**/*'],
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}

module.exports = withPWA(nextConfig)
