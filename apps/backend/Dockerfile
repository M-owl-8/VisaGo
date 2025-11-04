# Production-ready Dockerfile for VisaBuddy Backend
# Multi-stage build for minimal final image size

# ============================================================================
# STAGE 1: Builder
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma Client before build
RUN npx prisma generate

# Build backend
RUN npm run build

# ============================================================================
# STAGE 2: Runtime
# ============================================================================
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache curl dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --legacy-peer-deps --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy necessary configuration files
COPY .env.example .env.example
COPY tsconfig.json tsconfig.json
COPY prisma prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Use non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]