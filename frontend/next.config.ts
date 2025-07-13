import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/secure-files/:folder/:filename',
        destination: 'http://localhost:8000/secure-files/:folder/:filename',
      },
    ];
  },
};

export default nextConfig;
