import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output ONLY for production Docker deployment
  // This creates a minimal server bundle with only necessary dependencies
  // Disabled in development to preserve hot reload functionality
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),

  // Turbopack configuration (Next.js 16 default bundler)
  // File watching/polling is controlled via environment variables:
  // - WATCHPACK_POLLING=true
  // - CHOKIDAR_USEPOLLING=true
  // - TURBOPACK_USE_POLLING=true
  // These are already set in docker-compose.dev.yml for Docker/WSL2 compatibility
  turbopack: {
    // Add custom rules here if needed (e.g., webpack loaders)
  },

  // Webpack configuration (fallback for --webpack mode)
  // WSL2 has known issues with filesystem event propagation
  // Polling is required for reliable hot reload in Docker containers
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after the first change
        ignored: ['**/node_modules', '**/.next'], // Don't watch these directories
      };
    }
    return config;
  },
};

export default nextConfig;
