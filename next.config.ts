import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal server bundle with only necessary dependencies
  output: 'standalone',
};

export default nextConfig;
