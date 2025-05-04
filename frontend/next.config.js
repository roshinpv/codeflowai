/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*', // Proxy API requests to backend
      },
      {
        source: '/files/:path*',
        destination: 'http://localhost:8000/files/:path*', // Proxy file requests
      },
    ]
  }
}

module.exports = nextConfig 