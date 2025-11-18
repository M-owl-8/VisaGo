# Multi-stage build for optimized production image
# IMPORTANT: Railway must use repo root as build context
# Settings: Root Directory = empty (or /), Dockerfile Path = apps/backend/Dockerfile

# Stage 1: Dependencies
# Use Debian-based image (node:20-slim) instead of Alpine for better sharp compatibility
FROM node:20-slim AS dependencies
WORKDIR /app

# Copy root package files (repo root context required)
COPY package.json ./
COPY package-lock.json ./
# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies (skip scripts to avoid husky install in production)
# Use npm install instead of npm ci to handle workspace dependencies better
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Build
FROM node:20-slim AS build
WORKDIR /app

# Install OpenSSL for Prisma (Debian uses apt instead of apk)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files (repo root context required)
COPY package.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/src ./apps/backend/src/

# Install all dependencies (including dev)
# Use npm install to ensure all workspace dependencies are resolved
RUN npm install

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-slim AS production
WORKDIR /app

# Install OpenSSL for Prisma (Debian uses apt instead of apk)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package.json for workspace resolution
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/package-lock.json ./package-lock.json
# Copy backend package.json
COPY --from=dependencies /app/apps/backend/package.json ./apps/backend/package.json

# Install production dependencies directly in production stage
# This ensures all workspace dependencies are properly installed and hoisted
# With Debian-based image, sharp will automatically install with correct binaries
WORKDIR /app
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Verify critical dependencies are installed (express should be in root node_modules)
# This will fail the build early if dependencies are missing
# Note: sharp is optional - app will work without it (image processing will be disabled)
RUN test -d /app/node_modules/express || (echo "ERROR: express not found in /app/node_modules" && ls -la /app/node_modules | head -20 && exit 1)
RUN test -d /app/node_modules/cors || (echo "ERROR: cors not found" && exit 1)
RUN test -d /app/node_modules/helmet || (echo "ERROR: helmet not found" && exit 1)
# Sharp is optional - don't fail if it's missing
RUN test -d /app/node_modules/sharp && echo "Sharp found" || echo "WARNING: Sharp not found - image processing will be disabled"

# Install Prisma CLI (needed for prisma db push in start script)
# Prisma CLI is a devDependency but needed in production for migrations
WORKDIR /app/apps/backend
RUN npm install prisma@^5.21.1 --no-save
WORKDIR /app

# Copy Prisma generated files (including query engine binaries)
# Prisma is installed at root level in monorepo
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy built files
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/apps/backend/package.json ./apps/backend/

# Create uploads directory
RUN mkdir -p /app/apps/backend/uploads

# Set working directory
WORKDIR /app/apps/backend

# Set NODE_PATH to include root node_modules for workspace module resolution
# This allows Node.js to find modules hoisted to root in monorepo setup
# Also include workspace node_modules as fallback
ENV NODE_PATH=/app/node_modules:/app/apps/backend/node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Create non-root user for security (Debian uses different user commands)
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start application
# Use node directly with NODE_PATH to ensure module resolution works
CMD ["sh", "-c", "NODE_PATH=/app/node_modules:/app/apps/backend/node_modules npm start"]
