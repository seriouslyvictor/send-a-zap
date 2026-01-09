import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output ONLY for production Docker deployment
  // This creates a minimal server bundle with only necessary dependencies
  // Disabled in development to preserve hot reload functionality
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
};

export default nextConfig;
