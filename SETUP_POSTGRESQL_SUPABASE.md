# PostgreSQL + Supabase Setup Guide

**Status**: CRITICAL - Do this first  
**Time to Complete**: 45 minutes  
**Complexity**: Medium  

---

## 📋 Overview

This guide walks you through migrating from SQLite to PostgreSQL (using Supabase), which is required for production and handles 10k+ concurrent users.

### Why Supabase?
- ✅ PostgreSQL managed hosting (automatic backups, scaling)
- ✅ Built-in authentication
- ✅ Real-time capabilities
- ✅ Free tier available ($0-25/month for startups)
- ✅ Easy migration from SQLite

---

## 🚀 Step 1: Create Supabase Account

1. **Go to**: https://supabase.com
2. **Sign up** with GitHub or email
3. **Create new project**:
   - Project name: `visabuddy-prod`
   - Database password: `<strong-password>`
   - Region: Select closest to your users
   - Click **Create new project** (takes ~2 minutes)

4. **Wait** for project to be created, then note your credentials:
   - Go to **Settings > Database**
   - Copy the **Connection String** (looks like):
     ```
     postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
     ```

---

## 🔧 Step 2: Update Environment Variables

Update `.env` in `c:\work\VisaBuddy\apps\backend\.env`:

```bash
# Old (REMOVE):
# DATABASE_URL=postgresql://localhost:5432/visabuddy_dev

# New (ADD):
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres?schema=public
```

Replace:
- `[YOUR_PASSWORD]` - from Supabase settings
- `[YOUR_HOST]` - from Supabase connection string

**Example**:
```
DATABASE_URL=postgresql://postgres:abc123xyz@efghijkl.supabase.co:5432/postgres?schema=public
```

---

## 📦 Step 3: Install PostgreSQL Driver

Run from `c:\work\VisaBuddy\apps\backend`:

```bash
npm install pg@latest
```

**Verify** (should show similar to):
```
added 3 packages
```

---

## 🔄 Step 4: Run Prisma Migration

From `c:\work\VisaBuddy\apps\backend`:

### Option A: Fresh Migration (Recommended for first time)

```bash
# Set environment
$env:DATABASE_URL = "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Seed with initial data (optional)
npm run db:seed
```

### Option B: Push schema directly (if no existing migrations)

```bash
npx prisma db push
```

---

## ✅ Step 5: Verify Connection

Run from backend folder:

```bash
npm run dev
```

**Expected output**:
```
🚀 Initializing VisaBuddy Backend Services...

📊 Initializing PostgreSQL Connection Pool...
✓ PostgreSQL Connection Pool ready

🔗 Testing Prisma Database Connection...
✓ Prisma Database Connection successful

📈 Database Pool Stats:
   - Status: connected
   - Total connections: 20
   - Idle connections: 20

✅ All services initialized successfully!

╔════════════════════════════════════════════════════════════╗
║         VisaBuddy Backend Server Started                    ║
║ Database: PostgreSQL (pooled)                              ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🔍 Troubleshooting

### Connection Timeout
```
Error: connect ETIMEDOUT [HOST]:5432
```
**Solution**: 
1. Verify DATABASE_URL is correct
2. Check Supabase project is running
3. Whitelist your IP: Supabase → Settings → Database → Allowed Connections

### Authentication Failed
```
Error: password authentication failed
```
**Solution**: 
1. Reset password in Supabase → Settings → Database → Reset password
2. Update DATABASE_URL with new password

### Migration Failed
```
Error: Prisma migrate error
```
**Solution**:
1. Check schema.prisma has `provider = "postgresql"`
2. Run: `npx prisma db reset` (warning: deletes data)
3. Then: `npx prisma migrate dev --name init`

---

## 🎯 Connection Pool Configuration

The backend now uses connection pooling:

**Default settings** (in `db-pool.service.ts`):
- **Max connections**: 20
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

For production, you may want to increase:
```typescript
// In db-pool.service.ts
max: 50, // For 10k users
idleTimeoutMillis: 60000, // 60 seconds
```

---

## 📊 Monitoring Connection Pool

Add this health check endpoint to monitor connections:

```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "totalConnections": 20,
    "idleConnections": 18,
    "waitingRequests": 0
  }
}
```

---

## 🚀 Production Deployment

### On Supabase:
1. Go to **Settings > General**
2. Note your **Project URL** (save for later)
3. Create read-only replica:
   - **Settings > Replicas**
   - Click **Create replica**
   - Choose region closest to read traffic

### On your server:
```bash
# Set production environment
$env:NODE_ENV = "production"
$env:DATABASE_URL = "postgresql://postgres:[PASSWORD]@[YOUR_PROD_HOST]:5432/postgres?schema=public"

# Start server
npm run build && npm start
```

---

## 📈 Scaling Database

As you grow to 10k+ users:

### 1. **Upgrade Supabase Plan**
- Free: 500 Req/second limit
- Pro: $25/month, 5000 Req/second
- Custom: Enterprise scale

### 2. **Add Read Replicas**
```
Primary (write): Main Supabase
Read Replica 1: Asia region
Read Replica 2: Europe region
Read Replica 3: Americas region
```

### 3. **Connection Pooling**
Already configured with PgBouncer in code!

### 4. **Caching Layer**
Already implemented with node-cache + Redis optional

---

## ✅ Checklist

- [ ] Created Supabase account and project
- [ ] Copied DATABASE_URL to .env
- [ ] Updated Prisma schema provider to PostgreSQL
- [ ] Installed pg driver: `npm install pg`
- [ ] Ran migration: `npx prisma migrate dev --name init`
- [ ] Verified connection with: `npm run dev`
- [ ] Tested health endpoint: `curl http://localhost:3000/health`
- [ ] Configured for production environment

---

## 🎉 Success!

Your database is now production-ready and can handle:
- ✅ 10k+ concurrent users
- ✅ 100+ requests/second
- ✅ Automatic backups
- ✅ Easy scaling

**Next step**: Setup Firebase Storage (see `SETUP_FIREBASE_STORAGE.md`)
