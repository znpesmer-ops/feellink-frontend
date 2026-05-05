/** @type {import('next').NextConfig} */
// Deploy trigger: login fix - 2026-05-05
const nextConfig = {
  reactStrictMode: true,
  typescript: {
  ignoreBuildErrors: true,
  },
  eslint: {
  ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // ✅ framer-motion için webpack konfigürasyonu
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  images: {
    domains: [
      'localhost',
      '192.168.1.38',
      '192.168.1.59',
      '127.0.0.1',
      'indirect-shark-waters-titles.trycloudflare.com',
      'previously-willing-cbs-establishing.trycloudflare.com',
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3002',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3002',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Tüm HTTPS domain'lere izin ver
      },
      {
        protocol: 'http',
        hostname: '**', // Dev ortamında HTTP için
      },
    ],
  },
}

module.exports = nextConfig



