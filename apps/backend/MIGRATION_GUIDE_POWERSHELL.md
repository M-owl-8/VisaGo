# Database Migration Guide - PowerShell

## PowerShell Syntax for Environment Variables

In PowerShell, you **cannot** use bash-style environment variable syntax. Use the `$env:` prefix instead.

### ❌ Wrong (Bash/Linux syntax - doesn't work in PowerShell):

```powershell
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### ✅ Correct (PowerShell syntax):

```powershell
$env:DATABASE_URL="postgresql://postgres:password@host:port/database"; npx prisma migrate deploy
```

Or set it separately:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@host:port/database"
npx prisma migrate deploy
```

---

## Running Migrations on Production

### Step 1: Check Migration Status

```powershell
# Set DATABASE_URL (PowerShell syntax)
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

# Check status
npx prisma migrate status
```

**Expected Output:**

```
Datasource "db": PostgreSQL database "railway"
11 migrations found in prisma/migrations
✅ Database is up to date! No pending migrations.
```

### Step 2: Apply Migrations (if needed)

```powershell
# Apply any pending migrations
npx prisma migrate deploy
```

**Expected Output:**

```
✅ Applied migration: 20251209151448_add_ai_interaction_model
✅ Applied migration: ...
```

### Step 3: Verify Column Exists

If you can connect to the database, verify the `latencyMs` column:

```powershell
# Using Prisma Studio (recommended)
npx prisma studio

# Or using psql (if available)
psql $env:DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'AIInteraction' AND column_name = 'latencyMs';"
```

---

## Current Status

**Migration Status**: ✅ **All migrations applied**

The migration `20251209151448_add_ai_interaction_model` includes the `latencyMs` column in the `CREATE TABLE` statement, so if the migration was applied, the column should exist.

### If You Still See Errors

If production logs still show `"The column 'latencyMs' does not exist"` errors:

1. **Check if migration actually ran**:

   ```powershell
   $env:DATABASE_URL="<production-url>"
   npx prisma migrate status
   ```

2. **Check if table exists**:

   ```sql
   SELECT * FROM "AIInteraction" LIMIT 1;
   ```

3. **Check if column exists**:

   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'AIInteraction';
   ```

4. **If column is missing**, manually add it:
   ```sql
   ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER;
   ```

---

## Railway Deployment

### Option 1: Via Railway Dashboard

1. Go to Railway project → Database service
2. Open "Connect" tab
3. Copy the `DATABASE_URL`
4. Run migration locally:
   ```powershell
   $env:DATABASE_URL="<railway-url>"
   npx prisma migrate deploy
   ```

### Option 2: Via Railway CLI

```powershell
railway run --service backend npx prisma migrate deploy
```

### Option 3: Automatic via Startup Script

Ensure `startup.js` or Railway's start command includes:

```javascript
const { exec } = require('child_process');

exec('npx prisma migrate deploy', (error, stdout, stderr) => {
  if (error) {
    console.error('Migration error:', error);
    // Don't exit - migrations are non-critical for startup
  } else {
    console.log('Migrations applied:', stdout);
  }
});
```

---

## Important Notes

- **Non-fatal**: AI interaction logging is designed to be non-fatal. If `latencyMs` column is missing, the system will log a warning but continue working normally.
- **PowerShell syntax**: Always use `$env:VARIABLE_NAME="value"` in PowerShell, not `VARIABLE_NAME="value"`.
- **Connection issues**: If you can't connect to verify, the migration may have already been applied. Check Railway logs for migration execution.

---

## Troubleshooting

### Error: "Can't reach database server"

- Check if the `DATABASE_URL` is correct
- Verify network connectivity
- Check if Railway database is running
- Try using Railway CLI instead of direct connection

### Error: "No pending migrations to apply"

- ✅ This is **good** - it means all migrations are applied
- If you still see `latencyMs` errors, the column might have been created but Prisma client is cached
- Try: `npx prisma generate` to regenerate Prisma client

### Error: "The column 'latencyMs' does not exist"

- Check migration status: `npx prisma migrate status`
- If migrations are applied but column is missing, manually add it (see Step 3 above)
- Or re-run the specific migration
