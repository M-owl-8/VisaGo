const { PrismaClient } = require('@prisma/client');

async function verifyDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying Database Tables...\n');
    
    // Test 1: Check user count
    const userCount = await prisma.user.count();
    console.log('✅ User table exists - Records:', userCount);
    
    // Test 2: Check visa type count
    const visaCount = await prisma.visaType.count();
    console.log('✅ VisaType table exists - Records:', visaCount);
    
    // Test 3: Check visa application count
    const appCount = await prisma.visaApplication.count();
    console.log('✅ VisaApplication table exists - Records:', appCount);
    
    // Test 4: Check document count
    const docCount = await prisma.document.count();
    console.log('✅ Document table exists - Records:', docCount);
    
    console.log('\n📊 Database Status: ALL TABLES VERIFIED ✅');
    console.log('\nSchema Summary:');
    console.log('  - Users:', userCount);
    console.log('  - Visa Types:', visaCount);
    console.log('  - Applications:', appCount);
    console.log('  - Documents:', docCount);
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();