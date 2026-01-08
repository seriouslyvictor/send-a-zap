/**
 * Prisma Client Singleton
 *
 * This file creates a singleton instance of PrismaClient to prevent
 * creating too many connections in development mode (hot reloading).
 *
 * Usage:
 *   import { prisma } from '@/lib/prisma';
 *   const campaigns = await prisma.campaign.findMany();
 */

import { PrismaClient } from '@prisma/client';

// Declare global type for Prisma client singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client instance
// In development, reuse the global instance to prevent connection exhaustion
// In production, create a new instance
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Save to global in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
