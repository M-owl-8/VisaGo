# Multi-stage build for Next.js production (root = apps/web)
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy dependency manifests
COPY package.json ./
COPY package-lock.json* ./

# Remove workspace dependency that doesn't exist in Docker build context
RUN sed -i '/"visabuddy-monorepo"/d' package.json || true

# After mutating package.json, the existing lockfile can become invalid (and can even crash npm).
# Drop the lockfile inside the container and do a clean resolve instead.
RUN rm -f package-lock.json

# Install dependencies (more resilient on hosted builders)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Ensure public directory exists (Next.js optional)
RUN mkdir -p public

# Build Next.js app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

