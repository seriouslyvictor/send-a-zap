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
 *   import { prisma } from '@/lib/prisma';
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

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not defined. Please set it in your .env file.\n' +
    'Example: DATABASE_URL="postgresql://user:password@host:port/database"'
  );
}

// Reuse pool in development
const pool = globalThis.pgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') {
  globalThis.pgPool = pool;
}

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client instance with adapter
// In development, reuse the global instance to prevent connection exhaustion
// In production, create a new instance
export const prisma = globalThis.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Save to global in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
