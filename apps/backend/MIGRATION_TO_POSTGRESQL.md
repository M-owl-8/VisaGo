# PostgreSQL Migration Guide

## Status: Ready for PostgreSQL

The codebase is now fully configured for PostgreSQL. All schema files and migrations are ready.

## Current Configuration

- **Schema**: `prisma/schema.prisma` is set to PostgreSQL
- **Migration Lock**: Updated to `provider = "postgresql"`
- **Migrations**: All existing migrations support PostgreSQL

## To Complete Migration

### 1. Set PostgreSQL DATABASE_URL

Set your `DATABASE_URL` environment variable to a PostgreSQL connection string:

```bash
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy
```

### 2. Run Migrations

Once `DATABASE_URL` is set to PostgreSQL:

```bash
cd apps/backend

# Generate Prisma Client
npm run db:generate

# Deploy migrations (production)
npm run db:migrate:deploy

# OR for development
npm run db:migrate:dev
```

### 3. Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to verify
npm run db:studio
```

## Migration Files

All migrations in `prisma/migrations/` are compatible with PostgreSQL:

- `20251202120000_add_embassy_rules_postgresql`
- `20251205120000_gpt_risk_and_feedback_postgresql`
- `20251207000000_add_document_catalog_postgresql`
- And others...

## Schema Selector

The `prisma/schema-selector.js` script automatically selects:

- **PostgreSQL schema** when `DATABASE_URL` starts with `postgresql://` or `postgres://`
- **SQLite schema** when `DATABASE_URL` starts with `file:`

## Production Deployment (Railway/Heroku/etc.)

1. Set `DATABASE_URL` in your platform's environment variables
2. Run `npm run db:migrate:deploy` during deployment
3. The schema-selector will automatically use PostgreSQL

## Notes

- All Phase 2 & 3 changes are compatible with PostgreSQL
- No schema changes were needed for the migration
- The migration lock file has been updated to PostgreSQL
