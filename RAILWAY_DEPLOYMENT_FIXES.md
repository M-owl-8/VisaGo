# Railway Deployment Fixes - Complete Summary

**Date:** November 18, 2025  
**Status:** All fixes applied and deployed

---

## Issues Fixed

### 1. Package Lock File Sync Issue

**Problem:** `npm ci` failing with "Missing from lock file" errors  
**Root Cause:** package-lock.json was out of sync with package.json  
**Fix:**

- Regenerated package-lock.json with `npm install`
- Changed Dockerfile to use `npm install` instead of `npm ci` for better workspace compatibility

**Files Changed:**

- `package-lock.json` (regenerated)
- `apps/backend/Dockerfile` (changed `npm ci` to `npm install`)

---

### 2. Sharp Module Alpine Linux Compatibility

**Problem:** `Error: Could not load the "sharp" module using the linuxmusl-x64 runtime`  
**Root Cause:** Sharp needs platform-specific binaries for Alpine Linux (musl)  
**Fix:**

- Added step to reinstall sharp with Alpine/musl platform-specific binaries
- Used `npm install --os=linux --libc=musl --cpu=x64 sharp@^0.33.1 --include=optional --no-save`

**Files Changed:**

- `apps/backend/Dockerfile` (added sharp reinstall step)

---

### 3. Prisma CLI Missing in Production

**Problem:** `sh: prisma: not found`  
**Root Cause:** Prisma CLI is a devDependency but needed for `prisma db push` in start script  
**Fix:**

- Added step to install Prisma CLI in production stage
- Installed with `npm install prisma@^5.21.1 --no-save`

**Files Changed:**

- `apps/backend/Dockerfile` (added Prisma CLI installation)

---

### 4. Prisma Generate Failing at Runtime

**Problem:** `Error: Command failed with exit code 1: npm i @prisma/client@5.22.0 --silent`  
**Root Cause:** `prisma db push` was trying to regenerate client, but npm install was failing  
**Fix:**

- Added `--skip-generate` flag to `prisma db push` in start script
- Prisma client is already generated during build stage

**Files Changed:**

- `apps/backend/package.json` (updated start script)

---

### 5. Express Module Not Found

**Problem:** `Error: Cannot find module 'express'`  
**Root Cause:** Node.js couldn't resolve modules from workspace hoisted to root node_modules  
**Fix (Triple-Layer Approach):**

1. **Added root package.json for workspace resolution:**

   ```dockerfile
   COPY --from=dependencies /app/package.json ./package.json
   COPY --from=dependencies /app/package-lock.json ./package-lock.json
   ```

2. **Set NODE_PATH environment variable:**

   ```dockerfile
   ENV NODE_PATH=/app/node_modules:/app/apps/backend/node_modules
   ```

3. **Set NODE_PATH in CMD:**

   ```dockerfile
   CMD ["sh", "-c", "NODE_PATH=/app/node_modules:/app/apps/backend/node_modules npm start"]
   ```

4. **Set NODE_PATH in start script:**

   ```json
   "start": "... && NODE_PATH=/app/node_modules:/app/apps/backend/node_modules node dist/index.js"
   ```

5. **Added dependency verification:**
   ```dockerfile
   RUN test -d /app/node_modules/express || (echo "ERROR: express not found" && exit 1)
   RUN test -d /app/node_modules/cors || (echo "ERROR: cors not found" && exit 1)
   RUN test -d /app/node_modules/helmet || (echo "ERROR: helmet not found" && exit 1)
   ```

**Files Changed:**

- `apps/backend/Dockerfile` (multiple fixes)
- `apps/backend/package.json` (updated start script)

---

## Dockerfile Structure (Final)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/src ./apps/backend/src/
RUN npm install
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Copy root package files for workspace resolution
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/package-lock.json ./package-lock.json

# Copy production node_modules
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules

# Verify dependencies
RUN test -d /app/node_modules/express || (echo "ERROR: express not found" && exit 1)
RUN test -d /app/node_modules/cors || (echo "ERROR: cors not found" && exit 1)
RUN test -d /app/node_modules/helmet || (echo "ERROR: helmet not found" && exit 1)

# Reinstall sharp for Alpine
RUN npm install --os=linux --libc=musl --cpu=x64 sharp@^0.33.1 --include=optional --no-save

# Install Prisma CLI
WORKDIR /app/apps/backend
RUN npm install prisma@^5.21.1 --no-save
WORKDIR /app

# Copy Prisma generated files
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

# Set NODE_PATH for module resolution
ENV NODE_PATH=/app/node_modules:/app/apps/backend/node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start application
CMD ["sh", "-c", "NODE_PATH=/app/node_modules:/app/apps/backend/node_modules npm start"]
```

---

## Railway Configuration

**Required Settings:**

- **Root Directory:** Empty (or `/`)
- **Dockerfile Path:** `apps/backend/Dockerfile`
- **Build Command:** (empty - uses Dockerfile)
- **Start Command:** (empty - uses Dockerfile CMD)

---

## Verification Steps

After deployment, verify:

1. **Build succeeds:**
   - No "Missing from lock file" errors
   - No "sharp" module errors
   - No "prisma: not found" errors
   - Dependency verification passes

2. **Application starts:**
   - No "Cannot find module 'express'" errors
   - Prisma db push succeeds
   - Node.js application starts

3. **Health endpoint works:**
   ```bash
   curl https://visabuddy-backend-production.up.railway.app/api/health
   ```

---

## Troubleshooting

### If express module still not found:

1. **Check if dependencies are installed:**
   - Look for verification errors in build logs
   - Check if `/app/node_modules/express` exists

2. **Check NODE_PATH:**
   - Verify NODE_PATH is set in environment
   - Check if paths are correct

3. **Alternative fix (if needed):**
   - Install dependencies directly in production stage
   - Or use symlinks to workspace node_modules

### If Prisma fails:

1. **Check Prisma CLI:**
   - Verify `prisma` command is available
   - Check if Prisma binaries are copied correctly

2. **Check database connection:**
   - Verify DATABASE_URL is set correctly
   - Check if database is accessible

### If sharp fails:

1. **Check Alpine compatibility:**
   - Verify sharp is reinstalled with correct platform flags
   - Check if vips-dev is installed (if needed)

---

## Commits Made

1. `fix: regenerate package-lock.json and use npm install in Dockerfile for workspace compatibility`
2. `fix: install sharp with Alpine/musl platform-specific binaries for Railway deployment`
3. `fix: install Prisma CLI in production stage for db push command`
4. `fix: skip Prisma generate in start script since client is already generated during build`
5. `fix: copy root package.json for workspace module resolution in production`
6. `fix: set NODE_PATH environment variable for workspace module resolution`
7. `fix: add verification step to ensure express is installed in production stage`
8. `fix: add additional dependency verification checks for better error diagnostics`
9. `fix: enhance NODE_PATH and start command for better module resolution`
10. `fix: set NODE_PATH explicitly in start script for module resolution`

---

## Next Steps

1. Monitor Railway deployment logs
2. Verify backend starts successfully
3. Test health endpoint
4. Rebuild and install mobile app once backend is online

---

**Last Updated:** November 18, 2025  
**Status:** All fixes applied, waiting for deployment verification
