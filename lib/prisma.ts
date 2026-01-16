/**
 * Prisma Client Singleton (Prisma v7)
 *
 * This file creates a singleton instance of PrismaClient to prevent
 * creating too many connections in development mode (hot reloading).
 *
 * Prisma v7 requires database URL to be passed to constructor
 * or via adapter/accelerateUrl
 *
 * Usage:
 *   import { getPrisma } from '@/lib/prisma';
 *   const prisma = getPrisma();
 *   const campaigns = await prisma.campaign.findMany();
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Declare global type for Prisma client singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

// Lazy-loaded singleton instance (avoids build-time initialization)
let _prisma: PrismaClient | null = null;
let _pool: Pool | null = null;

export function getPrisma(): PrismaClient {
  if (_prisma) {
    return _prisma;
  }

  // Check for DATABASE_URL at runtime, not build time
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not defined. Please set it in your .env file.\n' +
      'Example: DATABASE_URL="postgresql://user:password@host:port/database"'
    );
  }

  // Create PostgreSQL connection pool
  _pool = globalThis.pgPool ?? new Pool({ connectionString });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.pgPool = _pool;
  }

  // Create Prisma adapter
  const adapter = new PrismaPg(_pool);

  // Create Prisma client instance with adapter
  _prisma = globalThis.prisma ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

  // Save to global in development to prevent hot reload issues
  if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = _prisma;
  }

  return _prisma;
}

// For backwards compatibility - but prefer getPrisma() for lazy loading
export const prisma = {
  get client() {
    return getPrisma();
  },
};

export default prisma;
