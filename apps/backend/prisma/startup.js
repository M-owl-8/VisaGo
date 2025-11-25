#!/usr/bin/env node

/**
 * Startup script for database initialization
 * - In production: Only runs migrations (non-destructive)
 * - In development: Runs db push and seed (if ALLOW_DB_WIPE=true)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isProd = 
  process.env.NODE_ENV === 'production' || 
  process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

console.log('[Startup] Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
  isProd,
  ALLOW_DB_WIPE: process.env.ALLOW_DB_WIPE,
});

/**
 * Check if an error is a P3005 error (database schema not empty, needs baseline)
 * Inspects all error fields to robustly detect P3005 errors
 */
function isP3005Error(err) {
  if (!err) return false;

  const parts = [];

  // Collect all possible error text sources
  if (typeof err.message === 'string') parts.push(err.message);
  if (typeof err.stderr === 'string') parts.push(err.stderr);
  if (Buffer.isBuffer(err.stderr)) parts.push(err.stderr.toString());
  if (typeof err.stdout === 'string') parts.push(err.stdout);
  if (Buffer.isBuffer(err.stdout)) parts.push(err.stdout.toString());
  if (typeof err.toString === 'function') {
    try {
      parts.push(err.toString());
    } catch (e) {
      // Ignore toString errors
    }
  }

  // Combine all text and check for P3005 indicators
  const text = parts.join('\n').toLowerCase();

  return (
    text.includes('p3005') ||
    text.includes('the database schema is not empty')
  );
}

/**
 * Run prisma migrate deploy with automatic baseline handling for P3005 errors
 * If the database is non-empty but has no migration history, baseline all migrations
 * and retry the deploy.
 */
function runMigrationsWithBaseline() {
  const backendCwd = path.join(__dirname, '..');
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    console.log('[Startup] Attempting to deploy migrations...');
    // Capture stderr to detect P3005 errors, but still show output
    let capturedStderr = '';
    try {
      execSync('npx prisma migrate deploy', {
        stdio: ['inherit', 'inherit', 'pipe'], // stdin: inherit, stdout: inherit, stderr: pipe
        cwd: backendCwd,
        encoding: 'utf8',
      });
      console.log('[Startup] Migrations completed successfully');
      return true;
    } catch (execError) {
      // Capture stderr if available
      if (execError.stderr) {
        capturedStderr = Buffer.isBuffer(execError.stderr) 
          ? execError.stderr.toString('utf8') 
          : String(execError.stderr);
      }
      // Re-throw to handle in outer catch
      throw execError;
    }
  } catch (error) {
    // Enhance error object with captured stderr for detection
    if (capturedStderr && !error.stderr) {
      error.stderr = capturedStderr;
    }
    
    // Use robust P3005 detection that checks all error fields
    const isP3005 = isP3005Error(error);

    if (isP3005) {
      console.log('[Startup] Detected existing non-empty database without Prisma migration history (P3005).');
      console.log('[Startup] Baselining existing migrations, then retrying migrate deploy...');

      try {
        // Read all migration directories
        if (!fs.existsSync(migrationsDir)) {
          console.error('[Startup] Migrations directory not found:', migrationsDir);
          throw new Error('Migrations directory not found');
        }

        const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
        const migrationDirs = entries
          .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
          .map(entry => entry.name)
          .sort(); // Sort to ensure consistent order

        if (migrationDirs.length === 0) {
          console.error('[Startup] No migration directories found in:', migrationsDir);
          throw new Error('No migrations found to baseline');
        }

        console.log(`[Startup] Found ${migrationDirs.length} migration(s) to baseline`);

        // Mark each migration as applied
        for (const migrationName of migrationDirs) {
          console.log(`[Startup] Marking migration as applied: ${migrationName}`);
          try {
            execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
              stdio: 'inherit',
              cwd: backendCwd,
            });
            console.log(`[Startup] ✓ Migration ${migrationName} marked as applied`);
          } catch (resolveError) {
            console.error(`[Startup] Failed to mark migration ${migrationName} as applied:`, resolveError.message);
            throw resolveError;
          }
        }

        console.log('[Startup] All migrations baselined. Retrying migrate deploy...');

        // Retry migrate deploy after baselining
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: backendCwd,
        });
        console.log('[Startup] Migrations completed successfully after baseline');
        return true;
      } catch (baselineError) {
        console.error('[Startup] Baseline process failed:', baselineError.message);
        throw baselineError;
      }
    } else {
      // For any other migration error, log and abort
      // Collect all error information for logging
      const errorParts = [];
      if (error.message) errorParts.push(`message: ${error.message}`);
      if (error.stderr) errorParts.push(`stderr: ${Buffer.isBuffer(error.stderr) ? error.stderr.toString() : error.stderr}`);
      if (error.stdout) errorParts.push(`stdout: ${Buffer.isBuffer(error.stdout) ? error.stdout.toString() : error.stdout}`);
      
      console.error('[Startup] Migration failed with non-P3005 error:', error.message);
      if (errorParts.length > 0) {
        console.error('[Startup] Error details:', errorParts.join(' | '));
      }
      throw error;
    }
  }
}

if (isProd) {
  console.log('[Startup] Production mode: Running migrations only (non-destructive)');
  try {
    runMigrationsWithBaseline();
  } catch (error) {
    console.error('[Startup] Migration process failed:', error.message);
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

