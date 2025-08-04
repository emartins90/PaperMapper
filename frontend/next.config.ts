import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/secure-files/:folder/:filename',
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/secure-files/:folder/:filename`,
      },
    ];
  },
};

export default nextConfig;
