/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*', // Proxy to FastAPI backend
      },
    ]
  },
  // Disable response body size limit so SSE streams can flow through the proxy
  // without being truncated or timed out (needed for long-running scan families)
  experimental: {
    proxyTimeout: 300000, // 5 minutes — covers the longest possible scan family
  },
}

module.exports = nextConfig
