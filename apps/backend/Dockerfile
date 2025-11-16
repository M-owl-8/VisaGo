# Multi-stage build for optimized production image
# This Dockerfile works with repo root as build context
# If Railway context is apps/backend, update Railway settings to use repo root

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy root package files (including package-lock.json if available)
COPY package.json ./
COPY package-lock.json* ./
# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies - use npm install if package-lock.json is missing
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production; \
    else \
      echo "Warning: package-lock.json not found, using npm install"; \
      npm install --only=production; \
    fi && \
    npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files (including package-lock.json if available)
COPY package.json ./
COPY package-lock.json* ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/src ./apps/backend/src/

# Install all dependencies (including dev) - use npm install if package-lock.json is missing
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      echo "Warning: package-lock.json not found, using npm install"; \
      npm install; \
    fi

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built files
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/apps/backend/package.json ./apps/backend/

# Create uploads directory
RUN mkdir -p /app/apps/backend/uploads

# Set working directory
WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start application
CMD ["npm", "start"]
