<<<<<<< HEAD
=======
// Auto-select Prisma schema based on DATABASE_URL
// This ensures the correct schema is used for local (SQLite) vs production (PostgreSQL)

const fs = require('fs');
const path = require('path');

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
  : path.join(__dirname, 'schema.prisma'); // schema.prisma is the SQLite version

const targetSchema = path.join(__dirname, 'schema.prisma');

console.log(`\n🔄 Auto-selecting Prisma schema...`);
console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 30)}...`);
console.log(`   Database type: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
console.log(`   Using schema: ${isPostgres ? 'schema.postgresql.prisma' : 'schema.prisma'}\n`);

>>>>>>> 42f5192 (chore: sync prisma client schema with selector)
// Copy the appropriate schema
try {
  fs.copyFileSync(sourceSchema, targetSchema);

  const schemaContent = fs.readFileSync(targetSchema, 'utf8');
  const expectedProvider = isPostgres ? 'postgresql' : 'sqlite';
  const hasCorrectProvider = schemaContent.includes(`provider = "${expectedProvider}"`);

  if (!hasCorrectProvider) {
    console.error(`❌ Error: Schema file was copied but provider is incorrect`);
    console.error(`   Expected provider: ${expectedProvider}`);
    process.exit(1);
  }

  console.log(`✅ Schema file updated successfully (provider: ${expectedProvider})`);

  // Ensure the generated Prisma client schema matches (needed on Railway)
  const prismaClientSchemaCandidates = [
    path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'schema.prisma'),
    path.join(__dirname, '..', '..', 'node_modules', '.prisma', 'client', 'schema.prisma'),
  ];

  const updatedClientSchemas = prismaClientSchemaCandidates.filter((candidate) => {
    if (fs.existsSync(candidate)) {
      try {
        fs.copyFileSync(sourceSchema, candidate);
        console.log(`   Prisma client schema updated at ${path.relative(process.cwd(), candidate)}`);
        return true;
      } catch (clientError) {
        console.warn(`⚠️  Warning: Failed to sync Prisma client schema at ${candidate}: ${clientError.message}`);
      }
    }
    return false;
  });

  if (updatedClientSchemas.length === 0) {
    console.log('   Prisma client schema not found (will be generated on next prisma generate)');
  }

  console.log();
} catch (error) {
  console.error(`❌ Error updating schema: ${error.message}`);
  console.error(`   Source: ${sourceSchema}`);
  console.error(`   Target: ${targetSchema}`);
  process.exit(1);
<<<<<<< HEAD
}
=======
}


>>>>>>> 42f5192 (chore: sync prisma client schema with selector)
