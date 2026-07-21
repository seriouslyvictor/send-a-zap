# Dockerfile for Next.js WhatsApp Automation Frontend
# Multi-stage build for optimized production image

# ===================================================================
# Stage 1: Dependencies
# ===================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Enable pnpm via corepack (version pinned by packageManager field in package.json)
RUN corepack enable pnpm

# Install dependencies based on package files
# pnpm-workspace.yaml carries the allowBuilds config - required so native deps
# like @prisma/engines and sharp are permitted to run their install scripts
# during `pnpm install`. Without it those scripts are silently skipped.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy prisma schema (needed for postinstall prisma generate)
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# ===================================================================
# Stage 2: Builder
# ===================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (version pinned by packageManager field in package.json)
RUN corepack enable pnpm

# Accept build arguments
ARG DATABASE_URL=postgresql://build:[REDACTED]@localhost:5432/build?schema=public
ARG BUILDTIME
ARG VERSION

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set environment to production for optimal build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=$DATABASE_URL

# Build Next.js application
# Note: Server-side env vars are baked into the build for API routes
RUN pnpm run build

# ===================================================================
# Stage 3: Runner
# ===================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Bind to all interfaces. Next's standalone server.js uses $HOSTNAME as its bind
# address, and Docker sets that to the container ID - which resolves to the eth0
# address only, leaving loopback refused and the HEALTHCHECK below unable to connect.
ENV HOSTNAME=0.0.0.0

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Health check
# Addressed as 127.0.0.1 rather than localhost: /etc/hosts maps localhost to ::1
# as well, and wget tries the IPv6 address first, where the server does not listen.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1

# Start Next.js server
CMD ["node", "server.js"]
