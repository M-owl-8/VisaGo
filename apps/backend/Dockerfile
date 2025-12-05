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
# IMPORTANT: Copy ALL package.json files BEFORE npm install so workspace dependencies are installed
COPY package.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
# Note: src is copied later to allow better caching

# Verify backend package.json was copied and contains cheerio
RUN echo "Verifying backend package.json..." && \
    test -f /app/apps/backend/package.json || (echo "ERROR: backend package.json not found" && exit 1) && \
    grep -q "cheerio" /app/apps/backend/package.json && echo "✓ cheerio found in backend package.json" || (echo "✗ cheerio NOT in backend package.json" && cat /app/apps/backend/package.json | grep -A 5 -B 5 "dependencies" && exit 1)

# Install all dependencies (including dev)
# Use npm install to ensure all workspace dependencies are resolved
# This must happen AFTER backend package.json is copied
RUN npm install

# Generate Prisma client (will use PostgreSQL schema on Railway)
WORKDIR /app/apps/backend
# Verify PostgreSQL schema file exists and list all schema files
RUN echo "=== Checking Prisma directory ===" && \
    ls -la prisma/ && \
    echo "=== Checking for schema.postgresql.prisma ===" && \
    test -f prisma/schema.postgresql.prisma || (echo "ERROR: schema.postgresql.prisma not found" && exit 1) && \
    echo "File found, checking contents..." && \
    echo "File has $(wc -l < prisma/schema.postgresql.prisma) lines" && \
    echo "=== Searching for all model definitions ===" && \
    grep "^model " prisma/schema.postgresql.prisma | tail -5 && \
    echo "=== Verifying required models ===" && \
    (grep -q "^model EmbassySource" prisma/schema.postgresql.prisma && echo "✓ EmbassySource: FOUND" || (echo "✗ EmbassySource: NOT FOUND" && echo "Searching for 'Embassy'..." && grep -i embassy prisma/schema.postgresql.prisma | head -3 && exit 1)) && \
    (grep -q "^model VisaRuleSet" prisma/schema.postgresql.prisma && echo "✓ VisaRuleSet: FOUND" || (echo "✗ VisaRuleSet: NOT FOUND" && exit 1)) && \
    (grep -q "^model VisaRuleVersion" prisma/schema.postgresql.prisma && echo "✓ VisaRuleVersion: FOUND" || (echo "✗ VisaRuleVersion: NOT FOUND" && exit 1))
# Force PostgreSQL schema for production build
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma || (echo "ERROR: Failed to copy schema" && exit 1)
# Verify copied schema has required models
RUN grep -q "model EmbassySource" prisma/schema.prisma && grep -q "model VisaRuleSet" prisma/schema.prisma && grep -q "model VisaRuleVersion" prisma/schema.prisma || (echo "ERROR: Required models missing from copied schema.prisma" && exit 1)
# Set DATABASE_URL to PostgreSQL format to prevent schema-selector.js from switching to SQLite
ENV DATABASE_URL=postgresql://placeholder
# Generate Prisma client with the correct schema (must happen before TypeScript compilation)
# Clear any existing Prisma client cache and regenerate
# In monorepo, Prisma client is generated at root node_modules, so we need to be at root
WORKDIR /app
RUN rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
WORKDIR /app/apps/backend
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy src directory BEFORE TypeScript compilation
# WORKDIR is /app/apps/backend, so copy to ./src/ (not ./apps/backend/src/)
WORKDIR /app
COPY apps/backend/src ./apps/backend/src/
WORKDIR /app/apps/backend

# Build TypeScript (skip prebuild hook since we've already set the schema correctly)
# Verify src directory exists and cheerio is installed before compilation
RUN test -d /app/apps/backend/src || (echo "ERROR: src directory not found" && ls -la /app/apps/backend/ && exit 1)
RUN echo "=== Checking npm installation ===" && \
    echo "Root node_modules exists: $(test -d /app/node_modules && echo 'YES' || echo 'NO')" && \
    echo "Backend node_modules exists: $(test -d /app/apps/backend/node_modules && echo 'YES' || echo 'NO')" && \
    echo "=== Searching for cheerio ===" && \
    (test -d /app/node_modules/cheerio && echo "✓ cheerio found in /app/node_modules" && ls -la /app/node_modules/cheerio | head -3) || \
    (test -d /app/apps/backend/node_modules/cheerio && echo "✓ cheerio found in /app/apps/backend/node_modules" && ls -la /app/apps/backend/node_modules/cheerio | head -3) || \
    (echo "✗ cheerio NOT FOUND in expected locations" && \
     echo "Searching entire /app directory..." && \
     find /app -name "cheerio" -type d 2>/dev/null | head -10 && \
     echo "Checking if cheerio is in package.json..." && \
     grep -q "cheerio" /app/apps/backend/package.json && echo "✓ cheerio is in package.json" || echo "✗ cheerio NOT in package.json" && \
     echo "Listing some root node_modules..." && \
     ls /app/node_modules 2>/dev/null | head -20 && \
     exit 1)
# Verify TypeScript can resolve cheerio by checking node_modules structure
RUN echo "TypeScript module resolution test..." && \
    node -e "try { require('cheerio'); console.log('✓ Node.js can require cheerio'); } catch(e) { console.log('✗ Node.js cannot require cheerio:', e.message); process.exit(1); }"
# Prisma client is already generated above, so just compile TypeScript
# Use --skipLibCheck to avoid type definition issues
RUN npx tsc --skipLibCheck && npx tsc prisma/seed.ts --skipLibCheck

# Copy static data files from src/data into dist/data (needed at runtime)
RUN mkdir -p /app/apps/backend/dist/data && cp -R /app/apps/backend/src/data/. /app/apps/backend/dist/data/

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
# Install sharp with platform-specific binaries for Linux x64 (Railway)
WORKDIR /app
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force
# Reinstall sharp with correct platform binaries for Linux x64
RUN npm install --no-save --platform=linux --arch=x64 sharp@^0.33.1 || echo "Sharp installation failed, will use fallback"

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
