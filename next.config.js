/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
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



