#!/usr/bin/env ts-node
/**
 * Standalone Migration Deployment Script
 * 
 * This script can be run manually to deploy all pending migrations to PostgreSQL.
 * Useful for:
 * - One-time migration runs
 * - Railway CLI execution
 * - Manual database updates
 * 
 * Usage:
 *   ts-node scripts/deploy-migrations.ts
 *   OR
 *   npm run db:migrate:deploy
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const backendDir = join(__dirname, '..');
const migrationsDir = join(backendDir, 'prisma', 'migrations');

console.log('🚀 Starting migration deployment...');
console.log('📁 Backend directory:', backendDir);
console.log('📁 Migrations directory:', migrationsDir);

// Check if migrations directory exists
if (!existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please set DATABASE_URL before running migrations');
  process.exit(1);
}

// Verify DATABASE_URL is PostgreSQL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL must be a PostgreSQL connection string');
  console.error('   Current format:', dbUrl.substring(0, 20) + '...');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set and valid (PostgreSQL)');
console.log('📊 Database:', dbUrl.split('@')[1]?.split('/')[1] || 'unknown');

try {
  // Run schema selector to ensure correct schema is used
  console.log('\n📋 Step 1: Selecting PostgreSQL schema...');
  execSync('node prisma/schema-selector.js', {
    cwd: backendDir,
    stdio: 'inherit',
  });

  // Generate Prisma client
  console.log('\n🔧 Step 2: Generating Prisma client...');
  execSync('npx prisma generate', {
    cwd: backendDir,
    stdio: 'inherit',
  });

  // Deploy migrations
  console.log('\n📦 Step 3: Deploying migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    stdio: 'inherit',
  });

  console.log('\n✅ Migration deployment completed successfully!');
  console.log('🎉 All migrations have been applied to the database.');
} catch (error: any) {
  console.error('\n❌ Migration deployment failed!');
  
  if (error.stderr) {
    const stderr = Buffer.isBuffer(error.stderr) 
      ? error.stderr.toString() 
      : String(error.stderr);
    console.error('Error output:', stderr);
  }
  
  if (error.message) {
    console.error('Error message:', error.message);
  }

  // Check for common errors
  const errorText = (error.stderr?.toString() || error.message || '').toLowerCase();
  
  if (errorText.includes('p3005') || errorText.includes('database schema is not empty')) {
    console.error('\n💡 Tip: Database has existing schema but no migration history.');
    console.error('   Run: npx prisma migrate resolve --applied <migration-name> for each migration');
    console.error('   Or use: npm run db:migrate:deploy (which handles baselining)');
  }
  
  if (errorText.includes('p3009') || errorText.includes('failed migrations')) {
    console.error('\n💡 Tip: There are failed migrations that need resolution.');
    console.error('   Check Railway logs for the failed migration name.');
    console.error('   Then run: npx prisma migrate resolve --rolled-back <migration-name>');
  }

  process.exit(1);
}

