# Seeding Embassy Sources to PostgreSQL

## Status
✅ Script is ready and configured  
⚠️ Connection to Railway PostgreSQL is currently failing

## What Was Done
1. ✅ Added `seed:embassy-sources` script to `package.json`
2. ✅ Fixed TypeScript configuration for scripts directory
3. ✅ Script successfully seeds to SQLite (tested)
4. ⚠️ PostgreSQL connection needs to be resolved

## Connection Issue
The script cannot reach the Railway PostgreSQL database at:
- `gondola.proxy.rlwy.net:31433`

## Solutions

### Option 1: Check Railway Database Settings
1. Go to Railway Dashboard → Your PostgreSQL service
2. Check if "Public Networking" is enabled
3. Verify the connection string is correct
4. Check if there are IP restrictions/whitelisting

### Option 2: Use Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run the seed script in Railway's environment
railway run npm run seed:embassy-sources
```

### Option 3: Run from Railway Environment
1. Go to Railway Dashboard
2. Open your backend service
3. Use the "Shell" or "Terminal" feature
4. Run: `npm run seed:embassy-sources`

### Option 4: Use Railway's Internal URL (if running from Railway)
If you're running this from within Railway's network, use the internal URL:
```powershell
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@postgres.railway.internal:5432/railway"
npm run seed:embassy-sources
```

### Option 5: Test Connection First
```powershell
# Test connection
npx prisma db pull --print

# If connection works, then run seed
npm run seed:embassy-sources
```

## What Gets Seeded
The script seeds embassy sources for:
- 🇺🇸 US (tourist, student)
- 🇨🇦 CA (tourist, student)
- 🇬🇧 GB (tourist, student)
- 🇦🇺 AU (tourist, student)
- 🇩🇪 DE (tourist, student)
- 🇪🇸 ES (tourist, student)
- 🇫🇷 FR (tourist, student)
- 🇮🇹 IT (tourist, student)
- 🇯🇵 JP (tourist, student)
- 🇦🇪 AE (tourist, student)

Total: 20 embassy source entries

## Once Connection Works
Simply run:
```powershell
cd apps/backend
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require"
npm run seed:embassy-sources
```

## Verification
After seeding, verify in Railway:
1. Open Railway Dashboard → PostgreSQL → Data
2. Query: `SELECT * FROM "EmbassySource";`
3. Should see 20 rows




