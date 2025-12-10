# Railway PostgreSQL Migration Guide

## Automatic Migration Execution

Migrations are **automatically executed** when the backend service starts on Railway.

### How It Works

1. **Dockerfile** uses `npm start` command
2. **`npm start`** runs `prisma/startup.js`
3. **`startup.js`** detects production environment and runs:
   ```bash
   npx prisma migrate deploy
   ```

### Production Detection

The startup script detects production when:

- `NODE_ENV === 'production'` OR
- `RAILWAY_ENVIRONMENT_NAME === 'production'`

### Migration Process

The `startup.js` script includes sophisticated error handling:

- **P3005 Error** (empty migration history): Automatically baselines all migrations
- **P3009 Error** (failed migrations): Automatically resolves and retries
- **P3018 Error** (migration apply failure): Attempts to resolve and retry

## Manual Migration Execution

If you need to run migrations manually (e.g., via Railway CLI):

### Option 1: Using npm script

```bash
cd apps/backend
npm run db:migrate:deploy
```

### Option 2: Using standalone script

```bash
cd apps/backend
npm run deploy:migrations
# OR
ts-node --project scripts/tsconfig.json scripts/deploy-migrations.ts
```

### Option 3: Direct Prisma command

```bash
cd apps/backend
node prisma/schema-selector.js
npx prisma migrate deploy
```

## Verification

### Check Migration Status

After deployment, verify migrations were applied:

```bash
# Via Railway CLI
railway run --service backend npx prisma migrate status

# Or check logs
railway logs --service backend | grep -i migration
```

### Expected Log Output

You should see in Railway logs:

```
[Startup] Production mode: Running migrations only (non-destructive)
[Startup] Attempting to deploy migrations...
[Startup] Migrations completed successfully
[Startup] Database initialization completed
```

## Migration Files

All migration files are in: `apps/backend/prisma/migrations/`

Key migrations include:

- `20251209151448_add_ai_interaction_model` - Includes `latencyMs` field
- All other schema migrations

## Troubleshooting

### Migrations Not Running

1. Check Railway environment variables:
   - `DATABASE_URL` must be set
   - `NODE_ENV` should be `production` (or `RAILWAY_ENVIRONMENT_NAME` set)

2. Check Railway logs for errors:

   ```bash
   railway logs --service backend
   ```

3. Verify Prisma schema selector:
   - Ensure `prisma/schema-selector.js` selects PostgreSQL schema
   - Check that `schema.postgresql.prisma` exists

### Migration Errors

If migrations fail:

1. **P3005 Error** (schema not empty):
   - The startup script will automatically baseline migrations
   - No manual intervention needed

2. **P3009 Error** (failed migration):
   - Check Railway logs for the failed migration name
   - The startup script will attempt to resolve automatically
   - If automatic resolution fails, manually resolve:
     ```bash
     railway run --service backend npx prisma migrate resolve --rolled-back <migration-name>
     ```

3. **Connection Errors**:
   - Verify `DATABASE_URL` is correct
   - Check Railway PostgreSQL service is running
   - Ensure network connectivity

## Current Status

✅ **All migrations are ready for deployment**
✅ **Automatic migration execution is configured**
✅ **Error handling is in place**
✅ **Standalone migration script is available**

The system will automatically apply all pending migrations when the backend service starts on Railway.
