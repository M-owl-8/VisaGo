// Auto-select Prisma schema based on DATABASE_URL
// This ensures the correct schema is used for local (SQLite) vs production (PostgreSQL)

const fs = require('fs');
const path = require('path');

// Validate that fs is available
if (!fs || typeof fs.copyFileSync !== 'function') {
  console.error(' Error: fs module is not available');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
// Check for PostgreSQL - Railway and other providers may use different formats
const isPostgres = 
  databaseUrl.startsWith('postgres://') || 
  databaseUrl.startsWith('postgresql://') ||
  databaseUrl.includes('postgres') ||
  databaseUrl.includes('railway') ||
  databaseUrl.includes('gondola.proxy.rlwy.net') ||
  (!databaseUrl.startsWith('file:') && !databaseUrl.endsWith('.db'));

const sourceSchema = isPostgres 
  ? path.join(__dirname, 'schema.postgresql.prisma')
  : path.join(__dirname, 'schema.sqlite.prisma'); // Use schema.sqlite.prisma as source for SQLite

const targetSchema = path.join(__dirname, 'schema.prisma');

console.log(\n Auto-selecting Prisma schema...);
console.log(   DATABASE_URL: ...);
console.log(   Database type: );
console.log(   Source schema: );
console.log(   Target schema: \n);

// Copy the appropriate schema
try {
  // Check if source file exists
  if (!fs.existsSync(sourceSchema)) {
    console.error( Error: Source schema file not found: );
    console.error(   Current directory: );
    console.error(   Available files: );
    process.exit(1);
  }

  // Copy the schema file
  fs.copyFileSync(sourceSchema, targetSchema);
  console.log( Schema file updated successfully\n);
} catch (error) {
  console.error( Error updating schema: );
  console.error(   Source: );
  console.error(   Target: );
  console.error(   Error stack: );
  process.exit(1);
}