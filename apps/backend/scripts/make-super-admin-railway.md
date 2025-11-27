# How to Run make-super-admin on Railway

## Problem

The DATABASE_URL you provided uses `postgres.railway.internal` which only works from within Railway's network (not from your local machine).

## Solution: Use Railway CLI

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Link to Your Project

```bash
cd apps/backend
railway link
```

Select your Railway project when prompted.

### Step 4: Run the Script

```bash
railway run npm run make-super-admin
```

This runs the script inside Railway's network where `postgres.railway.internal` is accessible.

## Alternative: Get Public Database URL

If Railway provides a public database URL:

1. Go to Railway Dashboard
2. Select your PostgreSQL service
3. Go to "Connect" or "Variables" tab
4. Look for `PUBLIC_DATABASE_URL` or external connection string
5. Use that URL instead (it will have a public hostname, not `.internal`)

Then run:

```bash
cd apps/backend
$env:DATABASE_URL = "postgresql://postgres:password@public-hostname:5432/railway"
node prisma/schema-selector.js
npx prisma generate
npm run make-super-admin
```
