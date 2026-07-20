# Dockerfile for Next.js WhatsApp Automation Frontend
# Multi-stage build for optimized production image

# ===================================================================
# Stage 1: Dependencies
# ===================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on package files
COPY package.json package-lock.json ./

# Copy prisma schema (needed for postinstall prisma generate)
COPY prisma ./prisma

RUN npm ci && \
    npm cache clean --force

# ===================================================================
# Stage 2: Builder
# ===================================================================
FROM node:20-alpine AS builder
WORKDIR /app

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
RUN npm run build

# ===================================================================
# Stage 3: Runner
# ===================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Start Next.js server
CMD ["node", "server.js"]
