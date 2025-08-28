import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    clientInstrumentationHook: true
  },
  async rewrites() {
    // In development, proxy directly to backend
    // In production, use API route for better cookie handling
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/secure-files/:folder/:filename',
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/secure-files/:folder/:filename`,
        },
        {
          source: '/api/static-assets/:filename',
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/static-assets/:filename`,
        },
      ];
    }
    // In production, no rewrite - use API route
    return [];
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
