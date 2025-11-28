# Database Migration Instructions

## Overview

The `DocumentChecklist` model has been added to the Prisma schema to support persistent storage of AI-generated document checklists. This migration must be run before the application can function correctly in production.

## What This Migration Does

- Creates a new `DocumentChecklist` table in your database
- Establishes a one-to-one relationship between `Application` and `DocumentChecklist`
- Enables the application to store and retrieve checklists without regenerating them on every request

## Prerequisites

- Node.js 20+ installed
- Database connection configured (`DATABASE_URL` in `.env`)
- Prisma CLI available (via `npx prisma` or `npm install -g prisma`)

## Development Database (SQLite)

**Location:** `apps/backend`

**Commands:**

```bash
cd apps/backend
npm install  # if needed
npm run db:migrate:dev
npm run db:generate
```

**What happens:**

1. `db:migrate:dev` creates a new migration file and applies it to your local SQLite database
2. `db:generate` regenerates the Prisma Client with the new model types

**Expected output:**

- Migration file created in `prisma/migrations/`
- Database schema updated
- Prisma Client regenerated

## Production Database (PostgreSQL)

**Location:** `apps/backend`

**Commands:**

```bash
cd apps/backend
npm install  # if needed
npm run db:migrate:deploy
npm run db:generate
```

**What happens:**

1. `db:migrate:deploy` applies pending migrations to your production database (does not create new migration files)
2. `db:generate` regenerates the Prisma Client

**⚠️ Important:**

- This command will **modify your production database**
- Ensure you have a database backup before running
- Run this during a maintenance window if possible

## Verification

After running the migration, verify it worked:

```bash
cd apps/backend
npx prisma studio
```

In Prisma Studio, you should see:

- A new `DocumentChecklist` table
- The table has the following fields: `id`, `applicationId`, `status`, `checklistData`, `aiGenerated`, `generatedAt`, `errorMessage`, `createdAt`, `updatedAt`

## Troubleshooting

### Error: "Migration failed"

**Solution:** Check your `DATABASE_URL` is correct and the database is accessible.

### Error: "Table already exists"

**Solution:** The migration may have been partially applied. Check your database schema manually or reset the migration state.

### Error: "Prisma Client is out of date"

**Solution:** Run `npm run db:generate` to regenerate the client.

## Rollback (if needed)

If you need to rollback this migration:

```bash
cd apps/backend
npx prisma migrate resolve --rolled-back <migration_name>
```

**Note:** This will remove the `DocumentChecklist` table and all its data. Use with caution.

## Next Steps

After running the migration:

1. Restart your backend server
2. Test checklist generation by creating a new application
3. Verify checklists are stored and retrieved correctly

---

**Migration Name:** `add_document_checklist`  
**Created:** November 27, 2025
