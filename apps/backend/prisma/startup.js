#!/usr/bin/env node

/**
 * Startup script for database initialization
 * - In production: Only runs migrations (non-destructive)
 * - In development: Runs db push and seed (if ALLOW_DB_WIPE=true)
 */

const { execSync } = require('child_process');
const path = require('path');

const isProd = 
  process.env.NODE_ENV === 'production' || 
  process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

console.log('[Startup] Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
  isProd,
  ALLOW_DB_WIPE: process.env.ALLOW_DB_WIPE,
});

if (isProd) {
  console.log('[Startup] Production mode: Running migrations only (non-destructive)');
  try {
    execSync('npx prisma migrate deploy --skip-generate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('[Startup] Migrations completed successfully');
  } catch (error) {
    console.error('[Startup] Migration failed:', error.message);
    // In production, if migrations fail, we might need to run db push for initial setup
    // But this should be rare and handled manually
    process.exit(1);
  }
} else {
  console.log('[Startup] Development mode: Running db push');
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('[Startup] Database schema synced');
    
    // Only run seed if ALLOW_DB_WIPE is explicitly set
    if (process.env.ALLOW_DB_WIPE === 'true') {
      console.log('[Startup] ALLOW_DB_WIPE=true: Running seed script');
      execSync('node prisma/seed.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } else {
      console.log('[Startup] Skipping seed (ALLOW_DB_WIPE not set to "true")');
    }
  } catch (error) {
    console.error('[Startup] Database setup failed:', error.message);
    process.exit(1);
  }
}

console.log('[Startup] Database initialization completed');

