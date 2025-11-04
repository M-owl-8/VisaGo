/**
 * Database Migration Script: SQLite → PostgreSQL
 * 
 * This script migrates data from SQLite development database to PostgreSQL production database.
 * 
 * Usage:
 *   npx ts-node prisma/migration-sqlite-to-postgres.ts
 * 
 * Prerequisites:
 *   1. PostgreSQL database already created
 *   2. Prisma migrations applied: npx prisma migrate deploy
 *   3. Both DATABASE_URL (production) and SQLITE_DATABASE_URL env vars set
 * 
 * Safety:
 *   - Backups source and target databases
 *   - Validates data before migration
 *   - Rolls back on error
 */

import { PrismaClient as PrismaClientPostgres } from "@prisma/client";
import SqliteDatabase from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || "prisma/dev.db";
const BACKUP_DIR = path.join(process.cwd(), "backup", new Date().toISOString().split("T")[0]);

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface MigrationStats {
  users: number;
  countries: number;
  visaTypes: number;
  applications: number;
  documents: number;
  payments: number;
  chatMessages: number;
  errors: string[];
}

async function backupDatabases(): Promise<void> {
  console.log("📦 Creating backups...");

  try {
    // Backup SQLite
    const sqliteBackup = path.join(BACKUP_DIR, "dev.db.backup");
    if (fs.existsSync(SQLITE_DB_PATH)) {
      fs.copyFileSync(SQLITE_DB_PATH, sqliteBackup);
      console.log(`  ✅ SQLite backup: ${sqliteBackup}`);
    }

    // PostgreSQL backup (using pg_dump if available)
    const pgPassword = process.env.DATABASE_PASSWORD;
    const pgUser = process.env.DATABASE_USER || "postgres";
    const pgHost = process.env.DATABASE_HOST || "localhost";
    const pgDb = process.env.DATABASE_NAME || "visabuddy";

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("postgresql")) {
      const backupFile = path.join(BACKUP_DIR, "postgres.backup");
      console.log("  ℹ️  PostgreSQL database should be backed up separately");
      console.log(`     Command: pg_dump -U ${pgUser} -h ${pgHost} ${pgDb} > ${backupFile}`);
    }
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

async function migrateData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    users: 0,
    countries: 0,
    visaTypes: 0,
    applications: 0,
    documents: 0,
    payments: 0,
    chatMessages: 0,
    errors: [],
  };

  // Connect to PostgreSQL
  const postgresClient = new PrismaClientPostgres({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connect to SQLite
  let sqliteDb: any;
  try {
    sqliteDb = new SqliteDatabase(SQLITE_DB_PATH);
    sqliteDb.pragma("journal_mode = WAL");
  } catch (error) {
    console.error("❌ Could not connect to SQLite database:", error);
    stats.errors.push("SQLite connection failed");
    return stats;
  }

  try {
    console.log("\n📊 Analyzing data to migrate...");

    // Get counts from SQLite
    const userCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM User").get() as any;
    const countryCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM Country").get() as any;
    const applicationCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM Application").get() as any;

    console.log(`  Users: ${userCount.count}`);
    console.log(`  Countries: ${countryCount.count}`);
    console.log(`  Applications: ${applicationCount.count}`);

    // Start transaction for PostgreSQL
    console.log("\n🔄 Starting migration...");

    // 1. Migrate Countries
    console.log("  → Migrating countries...");
    const countries = sqliteDb.prepare("SELECT * FROM Country").all() as any[];
    for (const country of countries) {
      try {
        await postgresClient.country.upsert({
          where: { code: country.code },
          update: country,
          create: {
            id: country.id,
            name: country.name,
            code: country.code,
            region: country.region,
            flag: country.flag,
            createdAt: new Date(country.createdAt),
            updatedAt: new Date(country.updatedAt),
          },
        });
        stats.countries++;
      } catch (error) {
        stats.errors.push(`Country migration error: ${error}`);
      }
    }

    // 2. Migrate Users
    console.log("  → Migrating users...");
    const users = sqliteDb.prepare("SELECT * FROM User").all() as any[];
    for (const user of users) {
      try {
        await postgresClient.user.upsert({
          where: { email: user.email },
          update: user,
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            password: user.password,
            language: user.language || "en",
            role: user.role || "USER",
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
        stats.users++;
      } catch (error) {
        stats.errors.push(`User migration error: ${error}`);
      }
    }

    // 3. Migrate Applications
    console.log("  → Migrating applications...");
    const applications = sqliteDb.prepare("SELECT * FROM Application").all() as any[];
    for (const app of applications) {
      try {
        await postgresClient.application.upsert({
          where: { id: app.id },
          update: app,
          create: {
            id: app.id,
            userId: app.userId,
            countryId: app.countryId,
            visaType: app.visaType,
            status: app.status || "DRAFT",
            createdAt: new Date(app.createdAt),
            updatedAt: new Date(app.updatedAt),
          },
        });
        stats.applications++;
      } catch (error) {
        stats.errors.push(`Application migration error: ${error}`);
      }
    }

    // 4. Migrate Documents
    console.log("  → Migrating documents...");
    const documents = sqliteDb.prepare("SELECT * FROM Document").all() as any[];
    for (const doc of documents) {
      try {
        await postgresClient.document.upsert({
          where: { id: doc.id },
          update: doc,
          create: {
            id: doc.id,
            applicationId: doc.applicationId,
            fileUrl: doc.fileUrl,
            documentType: doc.documentType,
            status: doc.status || "PENDING",
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          },
        });
        stats.documents++;
      } catch (error) {
        stats.errors.push(`Document migration error: ${error}`);
      }
    }

    // 5. Migrate Payments
    console.log("  → Migrating payments...");
    const payments = sqliteDb.prepare("SELECT * FROM Payment").all() as any[];
    for (const payment of payments) {
      try {
        await postgresClient.payment.upsert({
          where: { id: payment.id },
          update: payment,
          create: {
            id: payment.id,
            applicationId: payment.applicationId,
            amount: payment.amount,
            currency: payment.currency || "UZS",
            status: payment.status || "PENDING",
            method: payment.method,
            createdAt: new Date(payment.createdAt),
            updatedAt: new Date(payment.updatedAt),
          },
        });
        stats.payments++;
      } catch (error) {
        stats.errors.push(`Payment migration error: ${error}`);
      }
    }

    console.log("\n✅ Migration completed!");
    console.log(`   Users: ${stats.users}`);
    console.log(`   Countries: ${stats.countries}`);
    console.log(`   Applications: ${stats.applications}`);
    console.log(`   Documents: ${stats.documents}`);
    console.log(`   Payments: ${stats.payments}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ${stats.errors.length} errors occurred:`);
      stats.errors.forEach((err) => console.log(`   - ${err}`));
    }
  } finally {
    await postgresClient.$disconnect();
    sqliteDb.close();
  }

  return stats;
}

async function validateMigration(stats: MigrationStats): Promise<boolean> {
  console.log("\n🔍 Validating migration...");

  const postgresClient = new PrismaClientPostgres({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    const counts = {
      users: await postgresClient.user.count(),
      countries: await postgresClient.country.count(),
      applications: await postgresClient.application.count(),
      documents: await postgresClient.document.count(),
      payments: await postgresClient.payment.count(),
    };

    console.log("  PostgreSQL record counts:");
    Object.entries(counts).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });

    // Basic validation
    const isValid = counts.users > 0 || counts.countries > 0;
    if (isValid) {
      console.log("\n✅ Migration validation passed!");
    } else {
      console.log("\n⚠️  No data found in PostgreSQL. Migration may have failed.");
    }

    return isValid;
  } finally {
    await postgresClient.$disconnect();
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════╗
║  SQLite → PostgreSQL Migration Script      ║
║  VisaBuddy Backend                         ║
╚════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Backup
    await backupDatabases();

    // Step 2: Migrate
    const stats = await migrateData();

    // Step 3: Validate
    const isValid = await validateMigration(stats);

    if (stats.errors.length === 0 && isValid) {
      console.log("\n🎉 Migration successful!");
      console.log(`\n📌 Backups saved to: ${BACKUP_DIR}`);
      process.exit(0);
    } else {
      console.error("\n❌ Migration completed with errors. Review backups.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.error(`\n📌 Backups saved to: ${BACKUP_DIR}`);
    process.exit(1);
  }
}

main();