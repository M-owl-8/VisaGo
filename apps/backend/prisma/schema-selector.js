// Auto-select Prisma schema based on DATABASE_URL
// This ensures the correct schema is used for local (SQLite) vs production (PostgreSQL)

const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

const sourceSchema = isPostgres 
  ? path.join(__dirname, 'schema.postgresql.prisma')
  : path.join(__dirname, 'schema.sqlite.prisma');

const targetSchema = path.join(__dirname, 'schema.prisma');

console.log(`\n🔄 Auto-selecting Prisma schema...`);
console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 30)}...`);
console.log(`   Database type: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
console.log(`   Using schema: ${isPostgres ? 'schema.postgresql.prisma' : 'schema.sqlite.prisma'}\n`);

// Copy the appropriate schema
try {
  fs.copyFileSync(sourceSchema, targetSchema);
  console.log(`✅ Schema file updated successfully\n`);
} catch (error) {
  console.error(`❌ Error updating schema: ${error.message}`);
  process.exit(1);
}

