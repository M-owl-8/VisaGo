const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('\n🔍 VERIFYING DATABASE CONNECTION AND TABLES...\n');
    
    // Test connection
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Database connection successful');
    console.log(`   Timestamp: ${result[0].now}\n`);
    
    // Check tables
    console.log('📋 CHECKING TABLES...\n');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found! Database appears empty.');
      console.log('   Run: npx prisma db push');
      return;
    }
    
    console.log(`Found ${tables.length} tables:\n`);
    tables.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.table_name}`);
    });
    
    console.log('\n✅ Database verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();